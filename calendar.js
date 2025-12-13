// calendar.js (最终校准版：BASE_JIAZI_INDEX = 11)

// --- 导入所有数据文件 ---
import { lunarInfo } from './Lunar.js';      
import { sTermInfo, solarTerm } from './SolarTerm.js'; 
import { Gan, Zhi } from './ChineseEra.js';  
import { ChineseZodiac } from './ChineseZodiac.js'; 
import { festival, lFestival } from './Festival.js'; 
import { nStr1, nStr2, nStr3 } from './Salutation.js'; 
import { StarMansion, START_MANSION_INDEX } from './StarMansion.js'; 
import { NaYin } from './NaYin.js'; 

// --- 常量定义 ---
const LUNAR_START_YEAR = 1900;
const START_DAY_OFFSET = 27; // 农历偏移量修正
const BASE_JIAZI_INDEX = 10; // *** 最终校准值，确保 1988/12/18 为丁未 ***

// --- 工具函数定义 ---

// 1. 获取农历年的闰月月份
function getLunarLeapMonth(year) {
    if (year < LUNAR_START_YEAR) return 0;
    return lunarInfo[year - LUNAR_START_YEAR] & 0x0F;
}

// 2. 获取农历年的总天数
function getLunarYearDays(year) {
    let sum = 348;
    let code = lunarInfo[year - LUNAR_START_YEAR];
    for (let j = 0x0800; j > 0x0001; j >>= 1) {
        sum += (code & j) ? 1 : 0;
    }
    let leapMonth = getLunarLeapMonth(year);
    if (leapMonth > 0) {
        sum += (code & 0x10000) ? 30 : 29;
    }
    return sum;
}

// 3. 计算农历某个月的天数
function getLunarMonthDays(year, month, isLeap) {
    let code = lunarInfo[year - LUNAR_START_YEAR];
    if (isLeap && month === getLunarLeapMonth(year)) {
        return (code & 0x10000) ? 30 : 29; 
    }
    return (code & (0x80000 >> month)) ? 30 : 29;
}

// 4. 农历日数字转汉字函数
function lunarDayToChinese(d) {
    const s1 = nStr1; 
    const s2 = nStr2; 
    
    if (d === 10) return s2[1] + s1[10]; 
    if (d === 20) return s2[2] + s1[10]; 
    if (d === 30) return s2[3] + s1[10]; 

    if (d < 10) {
        return s2[0] + s1[d]; 
    }
    
    if (d > 10 && d < 20) {
        return s2[1] + s1[d - 10]; 
    }
    
    if (d > 20 && d < 30) {
        return s2[2] + s1[d - 20]; 
    }
    
    return ''; 
}

// 5. 查找公历节日
function getSolarFestival(m, d) {
    return festival[`${m}-${d}`] || null;
}

// 6. 查找农历节日
function getLunarFestival(m, d, isLeap) {
    return isLeap ? null : lFestival[`${m}-${d}`] || null; 
}

// 7. 公历转天数差 (用于星宿推算)
function dateToDays(y, m, d) {
    const baseDate = new Date(1900, 0, 1);
    const targetDate = new Date(y, m - 1, d);
    
    const diffTime = targetDate.getTime() - baseDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// 8. 推算当日干支和纳音
function getDayJiaZi(y, m, d) {
    const totalDays = dateToDays(y, m, d);
    const jiaziIndex = (totalDays + BASE_JIAZI_INDEX) % 60; 
    
    const ganIndex = jiaziIndex % 10;
    const zhiIndex = jiaziIndex % 12;

    const jiazi = Gan[ganIndex] + Zhi[zhiIndex];
    return {
        jiazi: jiazi,
        nayin: NaYin[jiazi] || '纳音信息缺失'
    };
}

// 9. 推算当日星宿
function getStarMansion(y, m, d) {
    const totalDays = dateToDays(y, m, d);
    const mansionIndex = (totalDays + START_MANSION_INDEX) % 28; 
    return StarMansion[mansionIndex];
}

// 10. 演禽术推算 (增强版：加入宜忌信息)
function calculateYanyingShu(mansion, nayin) {
    let result = `${mansion}宿 | 纳音：${nayin}。`;
    let detail = '';
    
    switch(mansion) {
        case "角": detail = "角木蛟：万事皆吉。宜祭祀、祈福、嫁娶、修造。"; break; 
        case "亢": detail = "亢金龙：宜嫁娶、作灶、纳畜。动土大凶。"; break; 
        case "氐": detail = "氐土貉：宜进人口、远行。不宜嫁娶。"; break;
        case "房": detail = "房日兔：宜开市、安葬、进人口。"; break;
        case "心": detail = "心月狐：凶，宜避动土、移徙。"; break; 
        case "尾": detail = "尾火虎：宜婚嫁、入宅、安床。"; break;
        case "箕": detail = "箕水豹：宜修造、动土、安门。"; break;
        case "斗": detail = "斗木獬：宜祈福、嫁娶、开光。"; break;
        case "牛": detail = "牛金牛：宜安葬、牧养、出行。"; break;
        case "女": detail = "女土蝠：凶，宜修屋、破土。"; break;
        case "虚": detail = "虚日鼠：宜祭祀、吉。忌移徙。"; break;
        case "危": detail = "危月燕：凶，宜避移徙、动土。"; break;
        case "室": detail = "室火猪：宜修造、动土、冠笄。"; break;
        case "壁": detail = "壁水貐：宜嫁娶、开市、纳财。"; break;
        case "奎": detail = "奎木狼：凶，宜避开市、置产。"; break;
        case "娄": detail = "娄金狗：宜入宅、修造、移徙。"; break;
        case "胃": detail = "胃土雉：宜出行、安葬、嫁娶。"; break;
        case "昴": detail = "昴日鸡：宜嫁娶、纳财、开市。"; break;
        case "毕": detail = "毕月乌：宜交易、开市、修造。"; break;
        case "觜": detail = "觜火猴：凶，宜避远行、开市。"; break;
        case "参": detail = "参水猿：宜出行、上任、开市。"; break;
        case "井": detail = "井木犴：宜嫁娶、开仓、修造。"; break;
        case "鬼": detail = "鬼金羊：凶，宜避动土、开市。"; break;
        case "柳": detail = "柳土獐：凶，宜避嫁娶、开市。"; break;
        case "星": detail = "星日马：凶，宜避移徙、嫁娶。"; break;
        case "张": detail = "张月鹿：宜祭祀、祈福、嫁娶。"; break;
        case "翼": detail = "翼火蛇：凶，宜避动土、修造。"; break;
        case "轸": detail = "轸水蚓：宜安葬、修造、移徙。"; break;
        default: detail = "（详细宜忌信息缺失）";
    }
    
    return `${result} 宜忌：${detail}`;
}


// --- 核心转换函数：公历转农历 (solarToLunar) ---
export function solarToLunar(y, m, d) {
    let temp = 0; 
    
    // 1. 计算天数差
    for (let i = LUNAR_START_YEAR; i < y; i++) {
        temp += getLunarYearDays(i);
    }
    for (let i = 1; i < m; i++) {
        temp += getLunarMonthDays(y, i, false);
    }
    temp += d;
    temp -= START_DAY_OFFSET;

    // 2. 倒推农历年份
    let year = LUNAR_START_YEAR; 
    
    while (temp > 0) {
        let Lyd = getLunarYearDays(year);
        if (temp > Lyd) {
            temp -= Lyd;
            year++;
        } else {
            break;
        }
    }

    // 3. 倒推农历月份和日期
    let month = 1;
    let isLeap = false;
    let leapMonth = getLunarLeapMonth(year); 

    while (temp > 0) {
        if (leapMonth > 0 && month === leapMonth && !isLeap) {
            let Lmd = getLunarMonthDays(year, month, true);
            if (temp > Lmd) {
                temp -= Lmd;
                isLeap = true;
                continue;
            } else {
                isLeap = true;
                break;
            }
        }
        
        let Lmd = getLunarMonthDays(year, month, false);
        if (temp > Lmd) {
            temp -= Lmd;
            month++;
            isLeap = false;
        } else {
            break;
        }
    }
    
    // --- 组合结果 ---
    const solarDate = new Date(y, m - 1, d); 
    const weekDay = nStr1[solarDate.getDay()];
    
    // 年干支和生肖
    const cYear = Gan[(year - 4) % 60 % 10] + Zhi[(year - 4) % 60 % 12];
    const zodiac = ChineseZodiac[(year - 4) % 12];
    
    // ** 演禽术计算 **
    const jiaziData = getDayJiaZi(y, m, d); 
    const mansion = getStarMansion(y, m, d); 
    const yanyingShuResult = calculateYanyingShu(mansion, jiaziData.nayin); 
    
    const solarFes = getSolarFestival(m, d);
    const lunarFes = getLunarFestival(month, temp, isLeap);

    return {
        solarYear: y,
        solarMonth: m,
        solarDay: d,
        weekDay: weekDay, 
        
        lunarYear: year,
        lunarMonth: month,
        lunarDay: temp, 
        isLeap: isLeap,
        
        cYear: cYear,
        cMonth: nStr3[month - 1], 
        cDay: lunarDayToChinese(temp), 
        zodiac: zodiac,

        solarFestival: solarFes ? solarFes.title : '',
        lunarFestival: lunarFes ? lunarFes.title : '',
        
        dayJiaZi: jiaziData.jiazi,
        dayNaYin: jiaziData.nayin,
        starMansion: mansion,
        yanyingShu: yanyingShuResult 
    };
}

// 导出所有功能
export const Calendar = {
    solarToLunar: solarToLunar,
};

export default Calendar;