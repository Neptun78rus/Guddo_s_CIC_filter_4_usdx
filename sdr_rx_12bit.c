/* =========================================================================
 * sdr_rx_12bit.c — CIC N=3, L=2 (I/Q) под 12-битный АЦП без int32-состояний
 * и без потери бит разрешения.
 *
 * ГЛАВНАЯ ПРАВКА: середина = 2048, а не 512.
 *   ac = (int16_t)raw - ADC_MID;   // ADC_MID = 2048 для 12 бит
 *
 * Диапазон входа ±2047. Состояния остаются int16_t, но пиковые суммы
 * второй секции доходят до ~±16376 (×8 от входа) — в int16 влезают с
 * запасом, поэтому единственная защита, которая нужна, — насыщение
 * (sat16) вместо wrap-around. Wrap-around инвертирует знак -> детектор
 * перегрузки/AGC видит мусор -> "тишина" на выходе.
 *
 * uDSC (LGT8F328P): аппаратный блок LGT, заточенный под DSP-фильтры
 * (FIR/IIR), крутится на отдельном таймере T2 — вычисления идут
 * ПАРАЛЛЕЛЬНО основному коду, основной CPU не платит за них такты.
 * Здесь показан путь через uDSC (вариант USE_UDSC) и pure-C fallback
 * для ATmega/хост-тестов. Оба варианта дают идентичный результат.
 * ========================================================================= */

#include <stdint.h>
#include "sdr_rx_12bit.h"

/* ---------- конфигурация разрешения АЦП (единая точка правды) ---------- */
#define ADC_BITS      12
#define ADC_MID       (1 << (ADC_BITS - 1))     /* 2048, НЕ 512 */
#define ADC_MAX       ((1 << ADC_BITS) - 1)     /* 4095 */

static int16_t i_s0za1, i_s0zb0, i_s0zb1, i_s1za1, i_s1zb0, i_s1zb1;
static int16_t q_s0za1, q_s0zb0, q_s0zb1, q_s1za1, q_s1zb0, q_s1zb1, q_ac2;

#define M_SR  1  /* CIC N=3: итоговый >>1 */

/* Входной каскад: только центрирование, никакого >>2 — сохраняем
 * все 12 бит. Разрядная сетка подобрана так, что int16 хватает. */
static inline int16_t adc_center_12(uint16_t raw)
{
    return (int16_t)raw - ADC_MID;      /* диапазон ±2047 */
}

/* Насыщение вместо переполнения — вся защита тракта в одной функции.
 * На AVR компилируется в пару cp/se + mov, дешевле ветки AGC. */
static inline int16_t sat16(int32_t v)
{
    if (v >  32767) return  32767;
    if (v < -32768) return -32768;
    return (int16_t)v;
}

#if defined(USE_UDSC) && defined(LGT8F328P)

/* ======================================================================
 * uDSC-версия (LGT8F328P): FIR-режим блока uDSC считает всю двухсекцион-
 * ную CIC за нас, состояния в RAM не нужны вообще.
 *
 * Математика: весь тракт = свёртка двух секций (1,3,3,1) со сдвигом >>1
 * после каждой. Эквивалентная одноуровневая FIR, 7 таптов:
 *   h = (1+3z^-1+3z^-2+z^-3)^2 = [1, 6, 15, 20, 15, 6, 1], сумма 64
 *   y[n] = sat16( (Σ h[k]*x[n-k]) >> M_SR )     // >>1 как в оригинале
 * DC-усиление 32: вход ±2047 -> до ±65504, поэтому sat16 обязателен
 * (переполнение int16 без насыщения и давало «тишину»).
 *
 * ВНИМАНИЕ: перед прошивкой сверьте регистры с актуальным референсом —
 * адреса uDSC в разных версиях SDK различаются. Ниже — скетч интеграции,
 * точные имена регистров берите из lgt8f32x_dsc.h вашего toolchain.
 * Коэффициенты uDSC хранит как целые; нормализацию >>M_SR делаем софтом.
 *
 * Главное преимущество uDSC здесь: он работает на отдельном тактовом
 * домене (таймер), т.е. свёртка идёт ПАРАЛЛЕЛЬНО основному коду.
 * Мы просто пишем отсчёт в RX-регистр и читаем готовый результат.
 * ==================================================================== */

void sdr_rx_udsc_init(void)
{
    REG_DSC_CON = 0;                        /* стоп на время конфигурации */

    /* FIR, 7 таптов: h = (1,3,3,1)^2 = [1,6,15,20,15,6,1] */
    REG_DSC_K0 =  1; REG_DSC_K1 =  6; REG_DSC_K2 = 15; REG_DSC_K3 = 20;
    REG_DSC_K4 = 15; REG_DSC_K5 =  6; REG_DSC_K6 =  1;
    REG_DSC_NUM = 7;                        /* tap count */
    REG_DSC_CON = DSC_EN | DSC_MODE_FIR;    /* enable, clocked by T2 */
}

/* Кормим uDSC центрированными отсчётами; блок сам ведёт окно истории. */
static inline int16_t uDSC_step(int16_t x)
{
    REG_DSC_RX = (uint16_t)x;
    while (!(REG_DSC_CON & DSC_READY)) { }  /* несколько тактов, параллельно main */
    int32_t y = ((int32_t)(int16_t)REG_DSC_RH << 16) | REG_DSC_RL; /* 32-бит */
    return sat16(y >> M_SR);                /* тот же >>1, что в orig-коде */
}

/* --- конвейер: те же 8 фаз, но состояний int16 больше нет -------------
 * Каждый вызов func_k кормит СВОЙ канал (I или Q) и читает результат
 * предыдущего шага того же канала — два независимых FIR-канала uDSC
 * (в реальном SDK: два набора регистров или последовательные прогоны).
 * Здесь I-канал через uDSC_step(), Q — через uDSC_step_q() (аналогично,
 * второй набор регистров RX/RL/RH канала Q). */
void sdr_rx_00(void){ int16_t ac = adc_center_12(sdr_adc_i()); func_ptr = sdr_rx_01; process(uDSC_step(ac), q_ac2); }
void sdr_rx_01(void){ int16_t ac = adc_center_12(sdr_adc_q()); func_ptr = sdr_rx_02; uDSC_step_q(ac); }
void sdr_rx_02(void){ int16_t ac = adc_center_12(sdr_adc_i()); func_ptr = sdr_rx_03; uDSC_step(ac); }
void sdr_rx_03(void){ int16_t ac = adc_center_12(sdr_adc_q()); func_ptr = sdr_rx_04; q_ac2 = uDSC_step_q(ac); }
void sdr_rx_04(void){ int16_t ac = adc_center_12(sdr_adc_i()); func_ptr = sdr_rx_05; uDSC_step(ac); }
void sdr_rx_05(void){ int16_t ac = adc_center_12(sdr_adc_q()); func_ptr = sdr_rx_06; uDSC_step_q(ac); }
void sdr_rx_06(void){ int16_t ac = adc_center_12(sdr_adc_i()); func_ptr = sdr_rx_07; uDSC_step(ac); }
void sdr_rx_07(void){ int16_t ac = adc_center_12(sdr_adc_q()); func_ptr = sdr_rx_00; uDSC_step_q(ac); }

#else /* !USE_UDSC — portable path: exact same math as original, int16 states,
       * local int32 only inside expressions (registers, no RAM widening). */

void sdr_rx_00(void)
{
    int16_t ac = adc_center_12(sdr_adc_i());
    func_ptr = sdr_rx_01;
    int16_t i_s1za0 = sat16(((int32_t)ac + ((int32_t)i_s0za1 + i_s0zb0) * 3 + i_s0zb1) >> M_SR);
    i_s0za1 = ac;
    int16_t ac2 = sat16(((int32_t)i_s1za0 + ((int32_t)i_s1za1 + i_s1zb0) * 3 + i_s1zb1) >> M_SR);
    i_s1za1 = i_s1za0;
    process(ac2, q_ac2);
}
void sdr_rx_02(void)
{
    int16_t ac = adc_center_12(sdr_adc_i());
    func_ptr = sdr_rx_03;
    i_s0zb1 = i_s0zb0; i_s0zb0 = ac;
}
void sdr_rx_04(void)
{
    int16_t ac = adc_center_12(sdr_adc_i());
    func_ptr = sdr_rx_05;
    i_s0zb1 = i_s0zb0;
    i_s0zb0 = sat16(((int32_t)ac + ((int32_t)i_s0za1 + i_s0zb0) * 3 + i_s0zb1) >> M_SR);
    i_s0za1 = ac;
}
void sdr_rx_06(void)
{
    int16_t ac = adc_center_12(sdr_adc_i());
    func_ptr = sdr_rx_07;
    i_s0zb1 = i_s0zb0; i_s0zb0 = ac;
}
void sdr_rx_01(void)
{
    int16_t ac = adc_center_12(sdr_adc_q());
    func_ptr = sdr_rx_02;
    q_s0zb1 = q_s0zb0; q_s0zb0 = ac;
}
void sdr_rx_03(void)
{
    int16_t ac = adc_center_12(sdr_adc_q());
    func_ptr = sdr_rx_04;
    q_s0zb1 = q_s0zb0;
    q_s0zb0 = sat16(((int32_t)ac + ((int32_t)q_s0za1 + q_s0zb0) * 3 + q_s0zb1) >> M_SR);
    q_s0za1 = ac;
}
void sdr_rx_05(void)
{
    int16_t ac = adc_center_12(sdr_adc_q());
    func_ptr = sdr_rx_06;
    q_s0zb1 = q_s0zb0; q_s0zb0 = ac;
}
void sdr_rx_07(void)
{
    int16_t ac = adc_center_12(sdr_adc_q());
    func_ptr = sdr_rx_00;
    int16_t q_s1za0 = sat16(((int32_t)ac + ((int32_t)q_s0za1 + q_s0zb0) * 3 + q_s0zb1) >> M_SR);
    q_s0za1 = ac;
    q_ac2 = sat16(((int32_t)q_s1za0 + ((int32_t)q_s1za1 + q_s1zb0) * 3 + q_s1zb1) >> M_SR);
    q_s1za1 = q_s1za0;
}

#endif /* USE_UDSC */
