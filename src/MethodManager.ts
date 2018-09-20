import {IAttributeDesc, COMPARISON, ISetSimilarityClass} from './interfaces';


// TODO remove
export function sayHello() {
  console.log("Hello")
}


/**
 * Returns methods applicable for the given attribute combinations.
 */
export interface IMethodManager {
  /**
   * Returns functions that can compare the given attributes.
   * @param a An Array of attributes. Each category will be compared to the categories of the attributes in b.
   * @param b An Array of attributes. Each category will be compared to the categories of the attributes in a.
   */
  getSetMethods(a: IAttributeDesc[], b: IAttributeDesc[], type?: COMPARISON): ISetSimilarityClass[];
}


export default class MethodManager {

}