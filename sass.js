const fs = require('fs')
const { renderSync } = require('sass')
const program = require('commander')
const pkg = require('./package.json')
const { rules } = require('./config')

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

const styles = fs.readdirSync('./styles')
for (const dir of styles) {
  const input = `./styles/${dir}/index.scss`
  if (fs.existsSync(input)) {
    const files = []
    for (const system of rules) {
      const path = `./rules/${system}/_${system}.scss`
      if (fs.existsSync(path)) files.push(path)
    }
    const lines = files.map(file => `@use '../.${file}';`)
    fs.writeFileSync(`./styles/${dir}/rules.scss`, lines.join('\n'))
    const output = `./public/css/${dir}.css`
    compile(input, output, style)
  }
}
