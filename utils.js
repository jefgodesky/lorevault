/**
 * Return a random number from an inclusive range.
 * @param {...number} numbers - Two or more numbers. A minimum and maximum are
 *   found from this set, and a random number is returned between those.
 * @returns {number} - A random number chosen from between the smallest number
 *   provided as a parameter and the largest.
 */

const pickRandomNum = (...numbers) => {
  const min = Math.min(...numbers)
  const max = Math.max(...numbers)
  return Math.floor(Math.random() * max) + min
}

/**
 * Return a random element from an array.
 * @param {*[]} arr - An array of elements.
 * @returns {*} - A random element from the array given.
 */

const pickRandom = arr => arr[pickRandomNum(0, arr.length - 1)]

/**
 * Returns the union of several arrays.
 * @param {...*[]} arr - One of the arrays to create a union from.
 * @returns {*[]} - An array that is the union of all arrays passed to the
 *   method as parameters.
 */

const union = (...arr) => {
  let all = []
  for (let i = 0; i < arr.length; i++) all = [...all, ...arr[i]]
  return [...new Set(all)]
}

/**
 * Returns the intersection of several arrays.
 * @param {...*[]} arr - One of the arrays to create an intersection from.
 * @returns {*[]} - An array that is the intersection of all arrays passed to
 *   the method as parameters.
 */

const intersection = (...arr) => {
  let intersection = []
  for (let i = 0; i < arr.length; i++) {
    if (i === 0) {
      intersection = arr[i]
    } else {
      intersection = intersection.filter(el => arr[i].includes(el))
    }
  }
  return intersection
}

export {
  pickRandomNum,
  pickRandom,
  union,
  intersection
}
