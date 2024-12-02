const csv = `
    path,name,value,format,ui-type,ui-options,label
    wifi,ssid,alternate net,string,text,,WiFi SSID
    wifi,password,12345678,string,password,,WiFi Password
    display,is12H,false,string,select,true=12 hour|false=24 hour,Time Format
    display,isTempF,false,string,select,true=°F|false=°C,Temperature Unit
    brightness,lightMin,4,number,range,1|10|1,Brightness
    timesync,ntp,ch.pool.ntp.org,string,text,,NTP Server
    dst,timezone,60,number,utcoffset,,UTC Offset
    dst,std_week,7,number,selectWeekInMonth,,Week
    dst,std_day,7,number,selectWeekDay3,,Day
    dst,std_month,10,number,selectMonth3,,Month
    dst,std_hour,3,number,range,0|23|1,Hour
    dst,dst_week,0,number,selectWeekInMonth,,Week
    dst,dst_day,7,number,selectWeekDay3,,Day
    dst,dst_month,3,number,selectMonth3,,Month
    dst,dst_hour,2,number,range,0|23|1,Hour
    dst,dstOffset,60,number,select,20=20 min|30=30 min|40=40 min|60=60 min,Daylight Saving Time Offset
    info,id,669248cee22b51ec2fcbd99c,string,staticText,,Id
    info,model,CWT9S19,string,staticText,,Model
    info,name,WHEN,string,staticText,,Name
    info,ver_now,1.6.0,string,staticText,,Version (current)
    info,ver_new,None,string,staticText,,Version (new)
    info,ver_note,,string,staticText,,Version Note
    info,rtc,83,string,staticText,,RTC
    info,factoryTime,1724397953,epochString,staticText,,Factory Time
    `

function trimLeft(str) { return str.split('\n').map(line => line.trimStart()).join('\n') }

function parseCsvToJson(csv) {
    csv = trimLeft(csv.trim())
    const rows = csv.split("\n").map(row => row.split(","))
    const headers = rows[0].map(header => header.trim())
    const dataRows = rows.slice(1)

    return dataRows.map(row => {
        const entry = {}
        headers.forEach((header, i) => {
            entry[header] = row[i]?.trim()
        })
        return entry
    })
}

function mapInputsToObjects(type, obj) {
    const prefix = Type.getName(type)+"."
    Object.keys(obj).forEach(key => {
        const input = document.querySelector(`[name="${prefix}${key}"]`)
        if (input) {
            let value = input.value
            // Preserve the type of the object attribute
            if (Array.isArray(obj[key])) { value = [value] }
            else if (typeof obj[key] === "number") { value = Number(value) }
            else if (typeof obj[key] === "boolean") { value = value === "true" }
            obj[key] = value
        }
    })
}

function mapObjectsToInputs(type, obj) {
    const prefix = Type.getName(type)+"."
    Object.keys(obj).forEach(key => {
        const input = document.querySelector(`[name="${prefix}${key}"]`)
        if (input) {
            input.value = obj[key]
            input.programmaticChange = true
            if (input.tagName.toLowerCase() === "select")
                input.dispatchEvent(new Event("change"))
            else input.dispatchEvent(new Event("input"))
        }
    })
}

function addSubmitListener() {
    const form = document.getElementById('submitter')
    form.addEventListener('submit', async (event) => {
        event.preventDefault()
        console.log('Form submission.')
        message = trimLeft(`
            The WiFi parameters have been set.
            If you confirm,
            IoT Timer will re-boot.
            It will be then available in the new network shortly.
        `)
        if (confirm(message)) {
            try {
                const result = await postSettings(Type.restart, {})
                console.log(result)
            } catch(error) {
                const message = "An unexpected error occurred:"
                alert(message+"\n"+error)
                console.log(message, error)
            }
        }
    })
}

function toggleVisibility(eventsender, idOfObjectToToggle) {
    var myNewState = "none"
    if (eventsender.checked === true) myNewState = "block"
    document.getElementById(idOfObjectToToggle).style.display = myNewState
}

function initTabs() {
    document.querySelectorAll('.tab-selectors button')?.forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-selectors button').forEach(btn => btn.classList.remove('selected'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            button.classList.add('selected');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    renderUiWidgets(parseCsvToJson(csv))
    addSubmitListener()
    initTabs()

    async function setupEventHandlersAndSync(type, event, elementId) {
        const element = document.getElementById(elementId)
        element.dataInitialized = false

        const settings = await loadSettings(type)
        // Attach event listener for changes
        element.addEventListener(event, async () => {
            if(element.programmaticChange) {
                element.programmaticChange = false
                return
            }
            mapInputsToObjects(type, settings)
            //if(element.dataInitialized)
                await updateSettings(type, settings)
            element.dataInitialized = true
        })

        // Sync initial values from settings to inputs
        mapObjectsToInputs(type, await loadSettings(type))
    }

    await setupEventHandlersAndSync(Type.display, "change", "display.isTempF")
    await setupEventHandlersAndSync(Type.display, "change", "display.is12H")
    await setupEventHandlersAndSync(Type.brightness, "input", "brightness.lightMin")
    await setupEventHandlersAndSync(Type.dst, "input", "dst.timezone")
})
