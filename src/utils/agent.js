import { capitalize } from "./string.js";

/**
 * a collection of utility functons to ease porting between different user agents.
 * @namespace me.utils.agent
 * @memberof me
 */

/**
 * Known agent vendors
 * @ignore
 */
var vendors = [ "ms", "MS", "moz", "webkit", "o" ];

/**
 * Get a vendor-prefixed property
 * @public
 * @name prefixed
 * @function
 * @param {string} name Property name
 * @param {object} [obj=window] Object or element reference to access
 * @returns {string} Value of property
 * @memberof me.utils.agent
 */
export function prefixed(name, obj) {
    obj = obj || window;
    if (name in obj) {
        return obj[name];
    }

    var uc_name = capitalize(name);

    var result;
    vendors.some(function (vendor) {
        var name = vendor + uc_name;
        return (result = (name in obj) ? obj[name] : undefined);
    });
    return result;
};

/**
 * Set a vendor-prefixed property
 * @public
 * @name setPrefixed
 * @function
 * @param {string} name Property name
 * @param {string} value Property value
 * @param {object} [obj=window] Object or element reference to access
 * @returns {boolean} true if one of the vendor-prefixed property was found
 * @memberof me.utils.agent
 */
export function setPrefixed(name, value, obj) {
    obj = obj || window;
    if (name in obj) {
        obj[name] = value;
        return;
    }

    var uc_name = capitalize(name);

    vendors.some(function (vendor) {
        var name = vendor + uc_name;
        if (name in obj) {
            obj[name] = value;
            return true;
        }
    });

    return false;
};
