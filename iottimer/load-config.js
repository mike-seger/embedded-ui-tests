const csv0 = `
    path,name,value,format,ui-type,ui-options,label
    wifi,ssid,alternate net,string,text,,WiFi SSID
    wifi,password,12345678,string,password,,WiFi Password
    display,timeformat,24h,string,select,0=12 hour|1=24 hour,Time format
    display,brightness,4,number,range,0|10|1,Brightness
    timesync,ntp,ch.pool.ntp.org,string,text,,NTP provider (leave empty to use pool.ntp.org)
    timesync,utcoffset,60,number,utcoffset,,UTC offset
    dst,std_week,7,number,selectWeekInMonth,,Week
    dst,std_day,7,number,selectWeekDay3,,Day
    dst,std_month,10,number,selectMonth3,,Month
    dst,std_hour,3,number,range,0|23|1,Hour
    dst,dst_week,0,number,selectWeekInMonth,,Week
    dst,dst_day,7,number,selectWeekDay3,,Day
    dst,dst_month,3,number,selectMonth3,,Month
    dst,dst_hour,2,number,range,0|23|1,Hour
    dst,offset,60,number,select,20|30|40|60,Daylight saving (summer) time UTC offset (in minutes)
    `

function parseCsvToJson(csv) {
    csv = csv.replace(/^ */mg,"").trim()
    const rows = csv.split("\n").map(row => row.split(","));
    const headers = rows[0].map(header => header.trim());
    const dataRows = rows.slice(1);

    return dataRows.map(row => {
        const entry = {};
        headers.forEach((header, i) => {
            entry[header] = row[i]?.trim();
        });
        return entry;
    });
}

const jsonConfig0 = parseCsvToJson(csv0);

document.addEventListener("DOMContentLoaded", () => {
    renderUiWidgets(jsonConfig0);
});