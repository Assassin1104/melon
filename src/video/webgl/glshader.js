import * as event from "./../../system/event.js";
import device from "./../../system/device.js";

/**
 * @ignore
 */
function extractUniforms(gl, shader) {
    var uniforms = {},
        uniRx = /uniform\s+(\w+)\s+(\w+)/g,
        uniformsData = {},
        descriptor = {},
        locations = {},
        match;

    // Detect all uniform names and types
    [ shader.vertex, shader.fragment ].forEach(function (shader) {
        while ((match = uniRx.exec(shader))) {
            uniformsData[match[2]] = match[1];
        }
    });

    // Get uniform references
    Object.keys(uniformsData).forEach(function (name) {
        var type = uniformsData[name];
        locations[name] = gl.getUniformLocation(shader.program, name);

        descriptor[name] = {
            "get" : (function (name) {
                /**
                 * A getter for the uniform location
                 * @ignore
                 */
                return function () {
                    return locations[name];
                };
            })(name),
            "set" : (function (name, type, fn) {
                if (type.indexOf("mat") === 0) {
                    /**
                     * A generic setter for uniform matrices
                     * @ignore
                     */
                    return function (val) {
                        gl[fn](locations[name], false, val);
                    };
                }
                else {
                    /**
                     * A generic setter for uniform vectors
                     * @ignore
                     */
                    return function (val) {
                        var fnv = fn;
                        if (val.length && fn.substr(-1) !== "v") {
                            fnv += "v";
                        }
                        gl[fnv](locations[name], val);
                    };
                }
            })(name, type, "uniform" + fnHash[type])
        };
    });
    Object.defineProperties(uniforms, descriptor);

    return uniforms;
};

/**
 * @ignore
 */
function extractAttributes(gl, shader) {
    var attributes = {},
        attrRx = /attribute\s+\w+\s+(\w+)/g,
        match,
        i = 0;

    // Detect all attribute names
    while ((match = attrRx.exec(shader.vertex))) {
        attributes[match[1]] = i++;
    }

    return attributes;
};

/**
 * @ignore
 */
function compileShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
    }

    return shader;
};

/**
 * Compile GLSL into a shader object
 * @ignore
 */
function compileProgram(gl, vertex, fragment, attributes) {
    var vertShader = compileShader(gl, gl.VERTEX_SHADER, vertex);
    var fragShader = compileShader(gl, gl.FRAGMENT_SHADER, fragment);

    var program = gl.createProgram();

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);


    // force vertex attributes to use location 0 as starting location to prevent
    // browser to do complicated emulation when running on desktop OpenGL (e.g. on macOS)
    for (var location in attributes) {
        gl.bindAttribLocation(program, attributes[location], location);
    }

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        var error_msg =
            "Error initializing Shader " + this + "\n" +
            "gl.VALIDATE_STATUS: " + gl.getProgramParameter(program, gl.VALIDATE_STATUS) + "\n" +
            "gl.getError()" + gl.getError() + "\n" +
            "gl.getProgramInfoLog()" + gl.getProgramInfoLog(program);
        // house cleaning
        gl.deleteProgram(program);
        program = null;
        // throw the exception
        throw new Error(error_msg);
    }

    gl.useProgram(program);

    // clean-up
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);

    return program;
};


/**
 * Hash map of GLSL data types to WebGL Uniform methods
 * @ignore
 */
var fnHash = {
    "bool"      : "1i",
    "int"       : "1i",
    "float"     : "1f",
    "vec2"      : "2fv",
    "vec3"      : "3fv",
    "vec4"      : "4fv",
    "bvec2"     : "2iv",
    "bvec3"     : "3iv",
    "bvec4"     : "4iv",
    "ivec2"     : "2iv",
    "ivec3"     : "3iv",
    "ivec4"     : "4iv",
    "mat2"      : "Matrix2fv",
    "mat3"      : "Matrix3fv",
    "mat4"      : "Matrix4fv",
    "sampler2D" : "1i"
};

/**
 * set precision for the fiven shader source
 * won't do anything if the precision is already specified
 * @ignore
 */
function setPrecision(src, precision) {
    if (src.substring(0, 9) !== "precision") {
        return "precision " + precision + " float;" + src;
    }
    return src;
};

/**
 * clean the given source from space, comments, etc...
 * @ignore
 */
function minify(src) {
    // remove comments
    src = src.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "$1");
    // Remove leading and trailing whitespace from lines
    src = src.replace(/(\\n\s+)|(\s+\\n)/g, "");
    // Remove line breaks
    src = src.replace(/(\\r|\\n)+/g, "");
    // Remove unnecessary whitespace
    src = src.replace(/\s*([;,[\](){}\\\/\-+*|^&!=<>?~%])\s*/g, "$1");

    return src;
};

/**
 * @classdesc
 * a base GL Shader object
 * @class GLShader
 * @memberof me
 * @param {WebGLRenderingContext} gl the current WebGL rendering context
 * @param {string} vertex a string containing the GLSL source code to set
 * @param {string} fragment a string containing the GLSL source code to set
 * @param {string} [precision=auto detected] float precision ('lowp', 'mediump' or 'highp').
 * @see https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_on_the_web/GLSL_Shaders
 * @example
 * // create a basic shader
 * var myShader = new me.GLShader(
 *    // WebGL rendering context
 *    gl,
 *    // vertex shader
 *    [
 *        "void main() {",
 *        "    gl_Position = doMathToMakeClipspaceCoordinates;",
 *        "}"
 *    ].join("\n"),
 *    // fragment shader
 *    [
 *        "void main() {",
 *        "    gl_FragColor = doMathToMakeAColor;",
 *        "}"
 *    ].join("\n")
 *  )
 * // use the shader
 * myShader.bind();
 */
class GLShader {

    constructor(gl, vertex, fragment, precision) {

        /**
         * the active gl rendering context
         * @public
         * @type {WebGLRenderingContext}
         * @name gl
         * @memberof me.GLShader
         */
        this.gl = gl;

        /**
         * the vertex shader source code
         * @public
         * @type {string}
         * @name vertex
         * @memberof me.GLShader
         */
        this.vertex = setPrecision(minify(vertex), precision || device.getMaxShaderPrecision(this.gl));

        /**
         * the fragment shader source code
         * @public
         * @type {string}
         * @name vertex
         * @memberof me.GLShader
         */
        this.fragment = setPrecision(minify(fragment), precision || device.getMaxShaderPrecision(this.gl));

        /**
         * the location attributes of the shader
         * @public
         * @type {GLint[]}
         * @name attributes
         * @memberof me.GLShader
         */
        this.attributes = extractAttributes(this.gl, this);


        /**
         * a reference to the shader program (once compiled)
         * @public
         * @type {WebGLProgram}
         * @name program
         * @memberof me.GLShader
         */
        this.program = compileProgram(this.gl, this.vertex, this.fragment, this.attributes);

        /**
         * the uniforms of the shader
         * @public
         * @type {object}
         * @name uniforms
         * @memberof me.GLShader
         */
        this.uniforms = extractUniforms(this.gl, this);

        // destroy the shader on context lost (will be recreated on context restore)
        event.on(event.WEBGL_ONCONTEXT_LOST, this.destroy, this);

        return this;
    }

    /**
     * Installs this shader program as part of current rendering state
     * @name bind
     * @memberof me.GLShader
     * @function
     */
    bind() {
        this.gl.useProgram(this.program);
    }

    /**
     * returns the location of an attribute variable in this shader program
     * @name getAttribLocation
     * @memberof me.GLShader
     * @function
     * @param {string} name the name of the attribute variable whose location to get.
     * @returns {GLint} number indicating the location of the variable name if found. Returns -1 otherwise
     */
    getAttribLocation(name) {
        var attr = this.attributes[name];
        if (typeof attr !== "undefined") {
            return attr;
        } else {
            return -1;
        }
    }

    /**
     * Set the uniform to the given value
     * @name setUniform
     * @memberof me.GLShader
     * @function
     * @param {string} name the uniform name
     * @param {object|Float32Array} value the value to assign to that uniform
     * @example
     * myShader.setUniform("uProjectionMatrix", this.projectionMatrix);
     */
    setUniform(name, value) {
        var uniforms = this.uniforms;
        if (typeof uniforms[name] !== "undefined") {
            if (typeof value === "object" && typeof value.toArray === "function") {
                uniforms[name] = value.toArray();
            } else {
                uniforms[name] = value;
            }
        } else {
            throw new Error("undefined (" + name + ") uniform for shader " + this);
        }
    }

    /**
     * destroy this shader objects resources (program, attributes, uniforms)
     * @name destroy
     * @memberof me.GLShader
     * @function
     */
    destroy() {
        this.uniforms = null;
        this.attributes = null;

        this.gl.deleteProgram(this.program);

        this.vertex = null;
        this.fragment = null;
    }
};

export default GLShader;
