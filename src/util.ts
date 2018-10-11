


// const intersection = selectionSet.filter(item => categorySet.indexOf(item) >= 0); // filter elements not in the second array
// const union = selectionSet.concat(categorySet).sort().filter((item, i, arr) => !i || item != arr[i-1]) // !i => if first elemnt, or if unqueal to previous item (item != arr[i-1]) include in arr


export function intersection(arr1: Array<any>, arr2: Array<any>) {
  let intersection = [];
  const filtered2 = arr2.slice(0); // Slice is fastest (internally optimized) on blink browsers (e.g. chrome)
  const filtered1 = arr1.filter((itemA) => {
    const indexB = filtered2.findIndex((itemB) => itemB === itemA); // check if there is a corresponding entry in the setB
    if (indexB >= 0) {
      intersection.push(itemA);
      filtered2.splice(indexB, 1);
      return false; // selItem will drop out of setA
    }
    return true;
  });

  return {"intersection": intersection, "arr1": filtered1, "arr2": filtered2};
}