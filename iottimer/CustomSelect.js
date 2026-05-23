/**
 * Generic custom <select> replacement.
 *
 * Why: native <select> popup menus are rendered by the OS / browser chrome
 * outside the page's CSS transform. When the page is uniformly scaled via
 * `transform: scale()`, the trigger scales but the popup stays at its
 * original (unscaled) size and at the unscaled DOM coordinates. Replacing
 * the popup with a DOM element inside the scaled subtree makes it scale
 * with the rest of the UI.
 *
 * Behaviour:
 *  - The underlying <select> remains in the DOM and stays the source of
 *    truth for value/name/form submission. It is hidden visually but kept
 *    focusable-by-script.
 *  - All existing 'change' and 'input' listeners on the <select> continue
 *    to work — we dispatch synthetic, bubbling events when the user picks
 *    an option.
 *  - External programmatic changes to select.value are detected (via a
 *    'change' listener) and reflected in the custom trigger label.
 *  - Closes on outside click and on Escape.
 *
 * Public API:
 *   customizeSelects(root = document)   // wrap every <select> under root
 */
(function () {
    let openInstance = null

    function closeOpen() {
        if (openInstance) {
            openInstance.close()
            openInstance = null
        }
    }

    document.addEventListener('click', (e) => {
        if (openInstance && !openInstance.wrapper.contains(e.target)) closeOpen()
    })
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeOpen()
    })

    function buildOne(select) {
        if (select.dataset.csWrapped === '1') return
        select.dataset.csWrapped = '1'

        const wrapper = document.createElement('div')
        wrapper.className = 'cs'

        const trigger = document.createElement('div')
        trigger.className = 'cs-trigger'
        trigger.setAttribute('role', 'button')
        trigger.setAttribute('tabindex', '0')

        const label = document.createElement('span')
        label.className = 'cs-label'
        trigger.appendChild(label)

        const caret = document.createElement('span')
        caret.className = 'cs-caret'
        caret.textContent = '▾'
        trigger.appendChild(caret)

        const list = document.createElement('div')
        list.className = 'cs-list'
        list.setAttribute('role', 'listbox')

        // Insert wrapper in place of the select; move select inside it.
        select.parentNode.insertBefore(wrapper, select)
        wrapper.appendChild(select)
        wrapper.appendChild(trigger)
        wrapper.appendChild(list)

        function refreshLabel() {
            const opt = select.options[select.selectedIndex]
            label.textContent = opt ? opt.textContent : ''
        }

        function rebuildList() {
            list.innerHTML = ''
            Array.from(select.options).forEach((opt, i) => {
                const item = document.createElement('div')
                item.className = 'cs-option'
                if (i === select.selectedIndex) item.classList.add('selected')
                item.setAttribute('role', 'option')
                item.dataset.value = opt.value
                item.textContent = opt.textContent
                item.addEventListener('click', (e) => {
                    e.stopPropagation()
                    if (select.value !== opt.value) {
                        select.value = opt.value
                        select.dispatchEvent(new Event('input', { bubbles: true }))
                        select.dispatchEvent(new Event('change', { bubbles: true }))
                    }
                    refreshLabel()
                    markSelected()
                    instance.close()
                })
                list.appendChild(item)
            })
        }

        function markSelected() {
            const items = list.querySelectorAll('.cs-option')
            items.forEach((el, i) => el.classList.toggle('selected', i === select.selectedIndex))
        }

        const instance = {
            wrapper,
            open() {
                closeOpen()
                rebuildList()
                wrapper.classList.remove('up')
                wrapper.classList.add('open')
                list.style.maxHeight = ''
                // After layout, decide whether to flip up and clamp height.
                requestAnimationFrame(() => {
                    const container = wrapper.closest('.container') || document.body
                    const cRect = container.getBoundingClientRect()
                    const tRect = trigger.getBoundingClientRect()
                    // Detect the scale applied to .container so we can convert
                    // viewport pixels back into pre-scale CSS pixels (which is
                    // what max-height needs to be expressed in).
                    const scale = tRect.width / trigger.offsetWidth || 1
                    const gap = 4 // small visual gap, in pre-scale px
                    const spaceBelowPx = (cRect.bottom - tRect.bottom) / scale - gap
                    const spaceAbovePx = (tRect.top - cRect.top) / scale - gap
                    const listH = list.offsetHeight
                    const flipUp = listH > spaceBelowPx && spaceAbovePx > spaceBelowPx
                    if (flipUp) wrapper.classList.add('up')
                    const maxH = Math.max(60, Math.floor(flipUp ? spaceAbovePx : spaceBelowPx))
                    list.style.maxHeight = maxH + 'px'

                    // Scroll the currently selected option into view (centered).
                    const selectedEl = list.querySelector('.cs-option.selected')
                    if (selectedEl) {
                        const target = selectedEl.offsetTop
                            - (list.clientHeight - selectedEl.offsetHeight) / 2
                        list.scrollTop = Math.max(0, target)
                    }
                })
                openInstance = instance
            },
            close() {
                wrapper.classList.remove('open')
                wrapper.classList.remove('up')
            },
            toggle() {
                if (wrapper.classList.contains('open')) {
                    instance.close()
                    openInstance = null
                } else {
                    instance.open()
                }
            },
        }

        trigger.addEventListener('click', (e) => {
            e.stopPropagation()
            instance.toggle()
        })
        trigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                instance.toggle()
            }
        })

        // Reflect external/programmatic value changes back into the label.
        select.addEventListener('change', refreshLabel)

        refreshLabel()
    }

    function customizeSelects(root) {
        root = root || document
        root.querySelectorAll('select').forEach(buildOne)
    }

    // expose globally
    window.customizeSelects = customizeSelects
})()
