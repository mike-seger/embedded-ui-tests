const config = {
    "wifi.ssid": "alternate net",
    "wifi.password": "12345678",
    "display.timeformat": "24h",
    "display.brightness": 4,
    "timesync.ntp": "ch.pool.ntp.org",
    "timesync.utcoffset": 60,
    "dst.std_week": 0,
    "dst.std_day": 7,
    "dst.std_month": 10,
    "dst.std_hour": 3,
    "dst.dst_week": 0,
    "dst.dst_day": 7,
    "dst.dst_month": 3,
    "dst.dst_hour": 2,
    "dst.offset": 60
}

const csv = `
    path,name,value,format,ui-type,ui-options,label
    wifi,ssid,alternate net,string,text,,WiFi SSID
    wifi,password,12345678,string,password,,WiFi Password
    display,timeformat,24h,string,select,0=12-hour|1=24-hour,Time format
    display,brightness,4,number,number,,Brightness: 0-10
    timesync,ntp,ch.pool.ntp.org,string,text,,NTP provider (leave empty to use pool.ntp.org)
    timesync,utcoffset,60,number,,UTC offset (minutes, -60=-1h, 60 = +1h)
    dst,std_week,0,number,select,,Enable Daylight Saving (summer time)
    dst,std_day,7,number,select,0=Last|1=First|2=Second|3=Third|4=Fourth,Week
    dst,std_month,10,number,select,1=Jan|2=Feb|3=March|4=Apr|5=May|6=Jun|7=Jul|8=Aug|9=Sep|10=Oct|11=Nov|12=Dec,Month
    dst,std_hour,3,number,number,,Hour
    dst,dst_week,0,number,select,0=Last|1=First|2=Second|3=Third|4=Fourth,Week
    dst,dst_day,7,number,select,1=Mon|2=Tue|3=Wed|4=Thu|5=Fri|6=Sat|7=Sun,Day
    dst,dst_month,3,number,select,1=Jan|2=Feb|3=March|4=Apr|5=May|6=Jun|7=Jul|8=Aug|9=Sep|10=Oct|11=Nov|12=Dec,Month
    dst,dst_hour,2,number,number,,Hour
    dst,offset,60,number,number,,Daylight saving (summer) time UTC offset (in minutes)
    `
    .replace(/^ */mg,"").trim()

const csv1 = configToCsv(config)
const nestedJson1 = csvToNestedJson(csv)
console.log(""+"\n", configToCsv(csvToNestedJson))
console.log("csv"+"\n", csv)
console.log("csv1"+"\n", csv1)
console.log("nestedJson1"+"\n", nestedJson1)
console.log("nestedJsonToCsv"+"\n", nestedJsonToCsv(nestedJson1, delimiter = ","))
console.log("toNested"+"\n", toNested(config))
console.log("toFlat"+"\n", toFlat(toNested(config)))

class UIWidget extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <form>
                <label for="name">Name:</label>
                <input type="text" id="name" name="name">
                <button type="submit">Submit</button>
            </form>
        `
    }
}

customElements.define('UiWidget', UIWidget)

function toNested(obj, valueTransformCallback = (key, value) => value) {
    const result = {}
    for (const [key, value] of Object.entries(obj)) {
        if (key.includes('.') && typeof value === 'object') {
            throw new Error(`Invalid object: "${key}" contains dots and cannot be used for nested objects.`)
        }

        const keys = key.split('.')
        let current = result

        keys.forEach((k, index) => {
            if (k.includes('.')) {
                throw new Error(`Invalid key: "${k}" contains dots, which is not allowed.`)
            }

            if (index === keys.length - 1) {
                current[k] = valueTransformCallback(key, value)
            } else {
                if (!current[k]) {
                    current[k] = {}
                } else if (typeof current[k] !== 'object') {
                    throw new Error(`Invalid structure: "${k}" is already a non-object.`)
                }
                current = current[k]
            }
        })
    }
    return result
}

function toFlat(obj, valueTransformCallback = (key, value) => value, prefix = '') {
    const result = {}
    for (const [key, value] of Object.entries(obj)) {
        if (key.includes('.')) {
            throw new Error(`Invalid key: "${key}" contains dots, which is not allowed.`)
        }

        const fullKey = prefix ? `${prefix}.${key}` : key

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            Object.assign(result, toFlat(value, valueTransformCallback, fullKey))
        } else {
            result[fullKey] = valueTransformCallback(fullKey, value)
        }
    }
    return result
}

function csvToNestedJson(csvData, delimiter = ",") {
    const rows = csvData.trim().split("\n").map(row => row.split(delimiter))
    const headers = rows[0]
    const dataRows = rows.slice(1)

    const result = {}

    for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        const row = dataRows[rowIndex];
        const entry = Object.fromEntries(headers.map((header, i) => [header, row[i]]))

        // Extract path, name, and value
        const { path, name, ...additional } = entry
        let value = additional.value
        delete additional.value

        // Parse value if it's a quoted string
        if (/^".*"$/.test(value)) {
            value = value.slice(1, -1); // Remove quotes
        } else if (!isNaN(value)) {
            value = Number(value); // Convert to number
        } else if (value === "true" || value === "false") {
            value = value === "true"; // Convert to boolean
        }

        // Add additional properties to the value if they exist
        const leaf = Object.keys(additional).length
            ? { value, ...additional, index: rowIndex }
            : { value, index: rowIndex };

        // Build the nested structure
        const fullPath = (path ? `${path}.` : "") + name
        const keys = fullPath.split(".")

        let current = result
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i]
            if (i === keys.length - 1) {
                current[key] = leaf
            } else {
                if (!current[key]) current[key] = {}
                current = current[key]
            }
        }
    }

    return result
}

function nestedJsonToCsv(json, delimiter = ",") {
    const rows = []
    const headers = new Set(["path", "name", "value"])

    // Helper function to flatten the structure
    function flatten(obj, path = "") {
        for (const [key, value] of Object.entries(obj)) {
            const fullPath = path ? `${path}.${key}` : key

            if (value && typeof value === "object" && !("value" in value)) {
                // Recurse for nested objects
                flatten(value, fullPath)
            } else {
                // Leaf node
                const row = { path, name: key }

                if (typeof value === "object" && "value" in value) {
                    // Handle additional columns
                    row.value = value.value
                    for (const [k, v] of Object.entries(value)) {
                        if (k !== "value") {
                            row[k] = v
                            headers.add(k)
                        }
                    }
                } else {
                    row.value = typeof value === "string" ? `"${value}"` : value
                }

                rows.push(row)
            }
        }
    }

    flatten(json)

    // Create header row
    const headerRow = Array.from(headers)
    const csvRows = [headerRow.join(delimiter)]

    // Create data rows
    for (const row of rows) {
        const csvRow = headerRow.map(header => (header in row ? row[header] : ""))
        csvRows.push(csvRow.join(delimiter))
    }

    return csvRows.join("\n")
}

function configToCsv(config, delimiter = ",") {
    const rows = []
    const headers = ["path", "name", "value", "format"]

    for (const [key, value] of Object.entries(config)) {
        // Split the key into path and name
        const lastDotIndex = key.lastIndexOf(".")
        const path = lastDotIndex !== -1 ? key.slice(0, lastDotIndex) : ""
        const name = key.slice(lastDotIndex + 1)

        // Determine the format and process the value
        const format = typeof value === "number" ? "number" : "string"
        const valueField = typeof value === "string" ? `"${value}"` : value

        // Add a row
        rows.push({ path, name, value: valueField, format })
    }

    // Convert to CSV
    const csvRows = [headers.join(delimiter)]
    for (const row of rows) {
        csvRows.push(headers.map(header => row[header]).join(delimiter))
    }

    return csvRows.join("\n")
}

