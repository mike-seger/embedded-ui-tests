const month3 = [ "Jan", "Feb", "Mar", "Apr", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ]
const weekDays3 = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const weekInMonth = ["Last", "First", "Second", "Third", "Fourth"]

function updateOffsetLabel(el) {
    const value = el.value
    const sign = Math.sign(value)
    const absHours = Math.floor(Math.abs(value) / 60)
    const absHoursStr = absHours.toString()
    const minutes = Math.abs(value % 60).toString()
    const offsetString = `UTC ${sign >= 0 ? '+' : '-'}${absHoursStr.padStart(2, '0')}:${minutes.padStart(2, '0')}`
    document.getElementById(`rv-${el.id}`).textContent = offsetString
}

function updateOffsetLabel1(el) {
    const value = parseInt(el.value, 10)
    const sign = Math.sign()
    const hours = Math.floor(value / 60)
    const minutes = ((value % 60) + 60) % 60 // Correctly handle negative modulus
    const absHours = Math.abs(hours).toString()
    const offsetString = `UTC ${hours >= 0 ? '+' : '-'}${absHours.padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    document.getElementById(`rv-${el.id}`).textContent = offsetString;
}

function toggleSlider(el) {
    const sliderContainer = document.getElementById(`${el.id}`);
    sliderContainer.classList.toggle("active");
}

function renderUiWidgets(json) {
    document.querySelectorAll("UiWidget").forEach(widget => {
        const id = widget.id
        const config = json.find(item => `${item.path}.${item.name}` === id)

        if (!config) {
            console.warn(`No configuration found for widget ID: ${id}`)
            return
        }

        function createSelect(uiOptions) {
            const options = uiOptions.split("|").map(option => {
                const [optionValue, optionLabel] = option.split("=")
                const selected = optionValue === value ? " selected" : ""
                return `<option value="${optionValue}"${selected}>${optionLabel?optionLabel:optionValue}</option>`
            })
            return `<select id="${id}" name="${id}">${options.join("")}</select>`
        }

        // Build HTML for the widget
        const { label, value, "ui-type": uiType, "ui-options": uiOptions } = config
        let replacementHtml = `<label for="${id}">${label}</label>`

        if (uiType === "text" || uiType === "password" || uiType === "number") {
            replacementHtml += `<input type="${uiType}" id="${id}" name="${id}" value="${value}">`
        } else if (uiType === "select" && uiOptions) {
            replacementHtml += createSelect(uiOptions)
        } else if (uiType === "selectMonth3") {
            replacementHtml += createSelect(month3.map((day, i) => `${i + 1}=${day}`).join("|"))
        } else if (uiType === "selectWeekDay3") {
            replacementHtml += createSelect(weekDays3.map((day, i) => `${i + 1}=${day}`).join("|"))
        } else if (uiType === "selectWeekInMonth") {
            replacementHtml += createSelect(weekInMonth.map((day, i) => `${i}=${day}`).join("|"))
        } else if (uiType === "range") {
            const [min, max, step] = uiOptions.split("|")
            //                <div id="slider-container-${id}" class="slider-container">
            replacementHtml += `
                <input type="range" id="${id}" min="${min}" max="${max}"
                    step="${step}" name="${id}" value="${value}" class="rangeStyle">
                <div id="rv-${id}" class="slider-value">${value}</div>
            `
        } else if (uiType === "utcoffset") {
            replacementHtml += `<input type="range" id="${id}" min="-720" max="840"
                step="15" name="${id}" value="${value}" class="colUTC"
                ><div id="rv-${id}" class="colUTCText">UTC +00:00</div>`
        } else {
            console.warn(`Unsupported ui-type: ${uiType} in:`, widget)
        }

        widget.outerHTML = `<div class="uiw-${uiType} ${widget.classList}">${replacementHtml}</div>`
    })

    document.querySelectorAll("input[type='range']").forEach(input => {
        console.log("rangestyle: "+input.id)
        input.addEventListener("input", () => {
            document.getElementById("rv-"+input.id).textContent = input.value;
        })
        document.getElementById("rv-"+input.id).textContent = input.value;
    })

    document.querySelectorAll(".uiw-utcoffset input[type='range']").forEach(input => {
        updateOffsetLabel(input)
        input.addEventListener("input", () => updateOffsetLabel(input))
    })
}
