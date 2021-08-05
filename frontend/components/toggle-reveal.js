import { create, toggleClass } from '../utils'

/**
 * Initialize reveal form toggles.
 * @param {Node[]} reveals - An array of elements that should have reveal
 *   toggles set up for them.
 */

const initToggleReveals = reveals => {
  for (const reveal of reveals) {
    const toggle = create('button', ['toggle-reveal-form'], {}, 'Reveal')
    toggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 512 512" viewBox="0 0 512 512">\n' +
      '  <path fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="15" d="M330.678 131.85c13.668 16.039 29.899 43.819 20.981 76.516 0 0-9.723 24.308-8.508 35.247s35.247 43.754 34.031 48.616c-1.215 4.862-29.17 7.292-29.17 12.154s9.562 25.124 9.562 25.124l-14.427 2.959c-11.321 2.322-14.962 16.687-6.114 24.121l10.384 8.724c0 0-11.56 4.703-11.56 9.565s2.431 34.031-4.862 36.462c-7.292 2.431-97.232-10.939-122.756-17.016M249.63 401.948c0 0-11.961 21.524-18.903 53.817" />\n' +
      '  <path fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="15" d="M72.791 434.882l24.849-67.298c0 0-102.094-77.786-76.57-196.895 1.724-8.044 3.987-15.818 6.729-23.294 0 0 40.748-129.113 188.316-114.742 100.636 9.8 152.141 72.37 167.367 133.275M306.509 104.956c0 0 9.76 114.949-109.527 142.06" />\n' +
      '  <path fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="15" d="M169.485 296.879L169.485 296.879c-15.051 0-27.251-12.201-27.251-27.251v-25.435c0-15.051 12.201-27.251 27.251-27.251h0c15.051 0 27.251 12.201 27.251 27.251M338.795 392.289l7.794 9.839c6.205 7.833 8.775 17.942 7.065 27.788l-5.134 29.557M401.269 382.811c3.989-22.963-11.234-38.411-24.053-47.096M374.977 247.938l7.86-45.435c1.355-7.803 8.78-13.03 16.583-11.674l0 0c7.803 1.355 13.03 8.78 11.674 16.583l-12.19 70.979" />\n' +
      '  <path fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="15" d="M398.904,278.39l13.774-80.094c1.355-7.803,8.78-13.03,16.583-11.674l0,0c7.803,1.355,13.03,8.78,11.674,16.583l-18.543,96.664" />\n' +
      '  <path fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="15" d="M422.392,299.869l18.543-96.664c1.355-7.803,8.78-13.03,16.583-11.674h0c7.803,1.355,13.03,8.78,11.674,16.583l-16.997,95.291" />\n' +
      '  <path fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="15" d="M450.02,315.368l16.429-91.463c1.253-7.211,8.594-11.958,16.397-10.602h0c7.803,1.355,13.113,8.3,11.861,15.511l-26.9,154.854c-2.266,13.042-10.043,24.475-21.342,31.373l-5.632,3.438c-8.621,5.263-14.556,13.987-16.285,23.939l-5.103,29.374"/>\n' +
      '</svg>'
    reveal.insertBefore(toggle, reveal.firstChild)
    toggle.addEventListener('click',() => {
      toggleClass(reveal, 'open')
    })
  }
}

export default initToggleReveals
