const fs = require('fs')
const { renderSync } = require('sass')
const program = require('commander')
const pkg = require('./package.json')

program.version(pkg.version)
program.option('-s, --style <outputStyle>', 'Output style (`expanded` or `compressed`)')
program.parse(process.argv)
const options = program.opts()

const style = options.style || 'compressed'

/**
 * Compile a Sass file to CSS.
 * @param {string} file - The path of the Sass file to compile.
 * @param {string} output - The path of the CSS file to output.
 * @param {string} outputStyle - Hoe the CSS should be compiled. Valid options
 *   are `expanded` or `compressed`.
 */

const compile = (file, output, outputStyle) => {
  try {
    const result = renderSync({ file, outputStyle })
    fs.writeFileSync(output, result.css)
    console.log(`Sass from ${file} compiled to ${output}`)
  } catch (err) {
    console.error(err)
  }
}

const files = fs.readdirSync('./scss')
for (const file of files.filter(f => f.endsWith('.scss'))) {
  const input = `./scss/${file}`
  const output = `./public/css/${file.substr(0, file.length - 5)}.css`
  compile(input, output, style)
}
