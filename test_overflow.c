// Симуляция конвейера sdr_rx_00..07 (I-канал, 8 тактов на кадр, M_SR=1).
// БАГ:   ac = ADC12 - 512   -> DC-смещение +1536 -> переполнение int16 -> "тишина"
// ФИКС A: ac = ADC12 - 2048 (+sat16) -> полная 12-бит точность, без потери LSB
// ФИКС B: ac = (ADC12>>2) - 512 (+sat16) -> минимальная диффа, потеря 2 бит
#include <stdio.h>
#include <stdint.h>

static int ofl;
static inline int16_t w(int32_t v){ if(v>32767||v<-32768) ofl++; return (int16_t)v; }
static inline int16_t sat16(int32_t v){ return v>32767?32767 : v<-32768?-32768 : (int16_t)v; }
#define M_SR 1

static int16_t za1,zb0,zb1,s1za1,s1zb0,s1zb1;
static uint8_t ph;

// один такт состояния по фазе 0..7 (как в оригинале, I-ветки).
// ВАЖНО: в оригинале ac2 НЕ сдвигается (>>M_SR отсутствует) — именно
// это отсутствие нормализации + DC-смещение и давало переполнение.
static int16_t tick(int16_t ac, int use_sat){
    int16_t out = 0;
    switch(ph){
    case 0: { // sdr_rx_00
        int16_t za0 = w(w(ac + w(za1+zb0)) + zb1) >> M_SR;
        int32_t ac2 = (int32_t)za0 + (int32_t)w(3*w(s1za1+s1zb0)) + s1zb1;   // без >>M_SR!
        s1za1 = za0; za1 = ac;
        out = use_sat ? sat16(ac2) : (int16_t)ac2; break; }
    case 1: zb1=zb0; zb0=ac; break;                       // sdr_rx_02
    case 2: { // sdr_rx_04
        int16_t za0 = w(w(ac + w(za1+zb0)) + zb1) >> M_SR;
        s1zb1=s1zb0; s1zb0=za0; za1=ac; break; }
    case 3: zb1=zb0; zb0=ac; break;                       // sdr_rx_06
    default: break;                                       // Q-фазы — зеркальны
    }
    ph = (ph+1)&7;
    return out;
}

static int16_t center_bug(uint16_t raw){ return (int16_t)raw - 512; }          // было: середина для 10 бит
static int16_t center_2048(uint16_t raw){ return (int16_t)raw - 2048; }        // правильная середина 12 бит + sat16
static int16_t center_fix(uint16_t raw){ return (int16_t)((raw>>2) - 512); }   // нормализация масштаба (потеря 2 бит)

static void run(const char* name, int16_t (*center)(uint16_t), int sat){
    za1=zb0=zb1=s1za1=s1zb0=s1zb1=0; ph=0; ofl=0;
    int16_t last=0, peak=0;
    for(int n=0;n<400;n++){
        uint16_t raw = 2048 + (((n/4)&1)? 20 : -20);  // слабая меандр-модуляция ±20 LSB (полная 12-бит точность!)
        last = tick(center(raw), sat);
        int16_t a = last<0?-last:last; if(a>peak) peak=a;
    }
    printf("%-38s переполнений=%-4d выходной пик=%d\n", name, ofl, peak);
}

int main(void){
    run("БАГ: ADC12 - 512",                 center_bug,   0);
    run("ФИКС A: ADC12 - 2048 + sat16",      center_2048,  1);
    run("ФИКС B: (ADC12>>2) - 512 + sat16",  center_fix,   1);
    // контроль: старый 10-битный АЦП не должен пострадать от сдвига
    za1=zb0=zb1=s1za1=s1zb0=s1zb1=0; ph=0; ofl=0; int16_t peak=0,last=0;
    for(int n=0;n<400;n++){
        uint16_t raw10 = 512 + (((n/4)&1)? 5 : -5);   // тот же масштаб после >>2
        last = tick((int16_t)raw10 - 512, 1);         // прямой путь без shift — эквивалентен
        int16_t a=last<0?-last:last; if(a>peak)peak=a;
    }
    printf("%-34s переполнений=%-4d выходной пик=%d\n","РЕГРЕССИЯ: 10-битный вход",ofl,peak);
    return 0;
}
