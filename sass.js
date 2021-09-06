import fs from 'fs'
import { createRequire } from 'module'
import sass from 'sass'
import program from 'commander'
import config from './config/index.js'

const require = createRequire(import.meta.url)
const { version } = require('./package.json')
const { renderSync } = sass
const { games } = config

program.version(version)
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

    // First we have to compile the games' Sass files
    for (const game of games) {
      const path = `./games/${game}/_${game}.scss`
      if (fs.existsSync(path)) files.push(path)
    }
    const lines = files.map(file => `@use '../.${file}';`)
    fs.writeFileSync(`./styles/${dir}/games.scss`, lines.join('\n'))

    // Then we can compile the style Sass files
    const output = `./public/css/${dir}.css`
    compile(input, output, style)
  }
}
