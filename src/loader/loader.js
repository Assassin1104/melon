import * as fileUtil from "./../utils/file.js";
import * as event from "./../system/event.js";
import device from "./../system/device.js";
import * as audio from "./../audio/audio.js";
import state from "./../state/state.js";
import level from "./../level/level.js";
import * as TMXUtils from "./../level/tiled/TMXUtils.js";


// contains all the images loaded
var imgList = {};
// contains all the TMX loaded
var tmxList = {};
// contains all the binary files loaded
var binList = {};
// contains all the JSON files
var jsonList = {};
// baseURL
var baseURL = {};

// flag to check loading status
var resourceCount = 0;
var loadCount = 0;
var timerId = 0;

/**
 * check the loading status
 * @ignore
 */
function checkLoadStatus(onload) {
    if (loadCount === resourceCount) {
        // wait 1/2s and execute callback (cheap workaround to ensure everything is loaded)
        if (onload || loader.onload) {
            // make sure we clear the timer
            clearTimeout(timerId);
            // trigger the onload callback
            // we call either the supplied callback (which takes precedence) or the global one
            var callback = onload || loader.onload;
            setTimeout(function () {
                callback();
                event.emit(event.LOADER_COMPLETE);
            }, 300);
        }
        else {
            throw new Error("no load callback defined");
        }
    }
    else {
        timerId = setTimeout(function() {
            checkLoadStatus(onload);
        }, 100);
    }
};

/**
 * load Images
 * @example
 * preloadImages([
 *     { name : 'image1', src : 'images/image1.png'},
 *     { name : 'image2', src : 'images/image2.png'},
 *     { name : 'image3', src : 'images/image3.png'},
 *     { name : 'image4', src : 'images/image4.png'}
 * ]);
 * @ignore
 */
function preloadImage(img, onload, onerror) {
    // create new Image object and add to list
    imgList[img.name] = new Image();
    imgList[img.name].onload = onload;
    imgList[img.name].onerror = onerror;
    if (typeof (loader.crossOrigin) === "string") {
        imgList[img.name].crossOrigin = loader.crossOrigin;
    }
    imgList[img.name].src = img.src + loader.nocache;
};

/**
 * load a font face
 * @example
 * preloadFontFace(
 *     name: "'kenpixel'", type: "fontface",  src: "url('data/font/kenvector_future.woff2')"
 * ]);
 * @ignore
 */
function preloadFontFace(data, onload, onerror) {
    var font = new FontFace(data.name, data.src);
    // loading promise
    font.load().then(function() {
        // apply the font after the font has finished downloading
        document.fonts.add(font);
        document.body.style.fontFamily = data.name;
        // onloaded callback
        onload();
    }, function () {
        // rejected
        onerror(data.name);
    });
};

/**
 * preload TMX files
 * @ignore
 */
function preloadTMX(tmxData, onload, onerror) {
    /**
     * @ignore
     */
    function addToTMXList(data) {
        // set the TMX content
        tmxList[tmxData.name] = data;

        // add the tmx to the level manager
        if (tmxData.type === "tmx") {
            level.add(tmxData.type, tmxData.name);
        }
    }


    //if the data is in the tmxData object, don't get it via a XMLHTTPRequest
    if (tmxData.data) {
        addToTMXList(tmxData.data);
        onload();
        return;
    }

    var xmlhttp = new XMLHttpRequest();
    // check the data format ('tmx', 'json')
    var format = fileUtil.getExtension(tmxData.src);

    if (xmlhttp.overrideMimeType) {
        if (format === "json") {
            xmlhttp.overrideMimeType("application/json");
        }
        else {
            xmlhttp.overrideMimeType("text/xml");
        }
    }

    xmlhttp.open("GET", tmxData.src + loader.nocache, true);
    xmlhttp.withCredentials = loader.withCredentials;
    // set the callbacks
    xmlhttp.ontimeout = onerror;
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState === 4) {
            // status = 0 when file protocol is used, or cross-domain origin,
            // (With Chrome use "--allow-file-access-from-files --disable-web-security")
            if ((xmlhttp.status === 200) || ((xmlhttp.status === 0) && xmlhttp.responseText)) {
                var result = null;

                // parse response
                switch (format) {
                    case "xml":
                    case "tmx":
                    case "tsx":
                        // ie9 does not fully implement the responseXML
                        if (device.ua.match(/msie/i) || !xmlhttp.responseXML) {
                            if (window.DOMParser) {
                                // manually create the XML DOM
                                result = (new DOMParser()).parseFromString(xmlhttp.responseText, "text/xml");
                            } else {
                                throw new Error("XML file format loading not supported, use the JSON file format instead");
                            }
                        }
                        else {
                            result = xmlhttp.responseXML;
                        }
                        // converts to a JS object
                        var data = TMXUtils.parse(result);
                        switch (format) {
                            case "tmx":
                                result = data.map;
                                break;

                            case "tsx":
                                result = data.tilesets[0];
                                break;
                        }

                        break;

                    case "json":
                        result = JSON.parse(xmlhttp.responseText);
                        break;

                    default:
                        throw new Error("TMX file format " + format + "not supported !");
                }

                //set the TMX content
                addToTMXList(result);

                // fire the callback
                onload();
            }
            else {
                onerror(tmxData.name);
            }
        }
    };
    // send the request
    xmlhttp.send();
};

/**
 * preload JSON files
 * @ignore
 */
function preloadJSON(data, onload, onerror) {
    var xmlhttp = new XMLHttpRequest();

    if (xmlhttp.overrideMimeType) {
        xmlhttp.overrideMimeType("application/json");
    }

    xmlhttp.open("GET", data.src + loader.nocache, true);
    xmlhttp.withCredentials = loader.withCredentials;

    // set the callbacks
    xmlhttp.ontimeout = onerror;
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState === 4) {
            // status = 0 when file protocol is used, or cross-domain origin,
            // (With Chrome use "--allow-file-access-from-files --disable-web-security")
            if ((xmlhttp.status === 200) || ((xmlhttp.status === 0) && xmlhttp.responseText)) {
                // get the Texture Packer Atlas content
                jsonList[data.name] = JSON.parse(xmlhttp.responseText);
                // fire the callback
                onload();
            }
            else {
                onerror(data.name);
            }
        }
    };
    // send the request
    xmlhttp.send();
};

/**
 * preload Binary files
 * @ignore
 */
function preloadBinary(data, onload, onerror) {
    var httpReq = new XMLHttpRequest();

    // load our file
    httpReq.open("GET", data.src + loader.nocache, true);
    httpReq.withCredentials = loader.withCredentials;
    httpReq.responseType = "arraybuffer";
    httpReq.onerror = onerror;
    httpReq.onload = function () {
        var arrayBuffer = httpReq.response;
        if (arrayBuffer) {
            var byteArray = new Uint8Array(arrayBuffer);
            var buffer = [];
            for (var i = 0; i < byteArray.byteLength; i++) {
                buffer[i] = String.fromCharCode(byteArray[i]);
            }
            binList[data.name] = buffer.join("");
            // callback
            onload();
        }
    };
    httpReq.send();
};

/**
 * preload Binary files
 * @ignore
 */
function preloadJavascript(data, onload, onerror) {
    var script = document.createElement("script");

    script.src = data.src;
    script.type = "text/javascript";
    if (typeof (loader.crossOrigin) === "string") {
        script.crossOrigin = loader.crossOrigin;
    }
    script.defer = true;

    script.onload = function() {
        // callback
        onload();
    };

    script.onerror = function() {
        // callback
        onerror(data.name);
    };

    document.getElementsByTagName("body")[0].appendChild(script);
};

/**
 * a small class to manage loading of stuff and manage resources
 * @namespace loader
 * @memberof me
 */
var loader = {

    /**
     * to enable/disable caching
     * @ignore
     */
    nocache : "",

    /*
     * PUBLIC STUFF
     */

    /**
     * onload callback
     * @public
     * @function
     * @name onload
     * @memberof me.loader
     * @example
     * // set a callback when everything is loaded
     * me.loader.onload = this.loaded.bind(this);
     */
    onload : undefined,

    /**
     * onProgress callback<br>
     * each time a resource is loaded, the loader will fire the specified function,
     * giving the actual progress [0 ... 1], as argument, and an object describing the resource loaded
     * @public
     * @function
     * @name onProgress
     * @memberof me.loader
     * @example
     * // set a callback for progress notification
     * me.loader.onProgress = this.updateProgress.bind(this);
     */
    onProgress : undefined,

    /**
     * crossOrigin attribute to configure the CORS requests for Image data element.
     * By default (that is, when the attribute is not specified), CORS is not used at all.
     * The "anonymous" keyword means that there will be no exchange of user credentials via cookies,
     * client-side SSL certificates or HTTP authentication as described in the Terminology section of the CORS specification.<br>
     * @public
     * @type {string}
     * @name crossOrigin
     * @default undefined
     * @memberof me.loader
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_settings_attributes
     * @example
     *  // allow for cross-origin texture loading in WebGL
     * me.loader.crossOrigin = "anonymous";
     *
     * // set all ressources to be loaded
     * me.loader.preload(game.resources, this.loaded.bind(this));
     */
    crossOrigin : undefined,

    /**
     * indicates whether or not cross-site Access-Control requests should be made using credentials such as cookies,
     * authorization headers or TLS client certificates. Setting withCredentials has no effect on same-site requests.
     * @public
     * @type {boolean}
     * @name withCredentials
     * @default false
     * @memberof me.loader
     * @see https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/withCredentials
     * @example
     *  // enable withCredentials
     * me.loader.withCredentials = true;
     *
     * // set all ressources to be loaded
     * me.loader.preload(game.resources, this.loaded.bind(this));
     */
    withCredentials : false,

    /**
     * just increment the number of already loaded resources
     * @ignore
     */
    onResourceLoaded(res) {
        // increment the loading counter
        loadCount++;

        // currrent progress
        var progress = loadCount / resourceCount;

        // call callback if defined
        if (this.onProgress) {
            // pass the load progress in percent, as parameter
            this.onProgress(progress, res);
        }
        event.emit(event.LOADER_PROGRESS, progress, res);
    },

    /**
     * on error callback for image loading
     * @ignore
     */
    onLoadingError(res) {
        throw new Error("Failed loading resource " + res.src);
    },

    /**
     * enable the nocache mechanism
     * @ignore
     */
    setNocache(enable) {
        this.nocache = enable ? "?" + ~~(Math.random() * 10000000) : "";
    },

    /**
     * change the default baseURL for the given asset type.<br>
     * (this will prepend the asset URL and must finish with a '/')
     * @name setBaseURL
     * @memberof me.loader
     * @public
     * @function
     * @param {string} type  "*", "audio", binary", "image", "json", "js", "tmx", "tsx"
     * @param {string} [url="./"] default base URL
     * @example
     * // change the base URL relative address for audio assets
     * me.loader.setBaseURL("audio", "data/audio/");
     * // change the base URL absolute address for all object types
     * me.loader.setBaseURL("*", "http://myurl.com/")
     */
    setBaseURL(type, url) {
        if (type !== "*") {
            baseURL[type] = url;
        } else {
            // "wildcards"
            baseURL["audio"] = url;
            baseURL["binary"] = url;
            baseURL["image"] = url;
            baseURL["json"] = url;
            baseURL["js"] = url;
            baseURL["tmx"] = url;
            baseURL["tsx"] = url;
            // XXX ?
            //baseURL["fontface"] = url;
        }
    },

    /**
     * set all the specified game resources to be preloaded.
     * @name preload
     * @memberof me.loader
     * @public
     * @function
     * @param {object[]} res
     * @param {string} res.name internal name of the resource
     * @param {string} res.type  "audio", binary", "image", "json","js", "tmx", "tsx", "fontface"
     * @param {string} res.src  path and/or file name of the resource (for audio assets only the path is required)
     * @param {boolean} [res.stream] Set to true to force HTML5 Audio, which allows not to wait for large file to be downloaded before playing.
     * @param {Function} [onload=me.loader.onload] function to be called when all resources are loaded
     * @param {boolean} [switchToLoadState=true] automatically switch to the loading screen
     * @example
     * game_resources = [
     *   // PNG tileset
     *   {name: "tileset-platformer", type: "image",  src: "data/map/tileset.png"},
     *   // PNG packed texture
     *   {name: "texture", type:"image", src: "data/gfx/texture.png"}
     *   // TSX file
     *   {name: "meta_tiles", type: "tsx", src: "data/map/meta_tiles.tsx"},
     *   // TMX level (XML & JSON)
     *   {name: "map1", type: "tmx", src: "data/map/map1.json"},
     *   {name: "map2", type: "tmx", src: "data/map/map2.tmx"},
     *   {name: "map3", type: "tmx", format: "json", data: {"height":15,"layers":[...],"tilewidth":32,"version":1,"width":20}},
     *   {name: "map4", type: "tmx", format: "xml", data: {xml representation of tmx}},
     *   // audio resources
     *   {name: "bgmusic", type: "audio",  src: "data/audio/"},
     *   {name: "cling",   type: "audio",  src: "data/audio/"},
     *   // binary file
     *   {name: "ymTrack", type: "binary", src: "data/audio/main.ym"},
     *   // JSON file (used for texturePacker)
     *   {name: "texture", type: "json", src: "data/gfx/texture.json"},
     *   // JavaScript file
     *   {name: "plugin", type: "js", src: "data/js/plugin.js"},
     *   // Font Face
     *   { name: "'kenpixel'", type: "fontface",  src: "url('data/font/kenvector_future.woff2')" }
     * ];
     * ...
     * // set all resources to be loaded
     * me.loader.preload(game.resources, this.loaded.bind(this));
     */
    preload(res, onload, switchToLoadState = true) {
        // parse the resources
        for (var i = 0; i < res.length; i++) {
            resourceCount += this.load(
                res[i],
                this.onResourceLoaded.bind(this, res[i]),
                this.onLoadingError.bind(this, res[i])
            );
        }
        // set the onload callback if defined
        if (typeof(onload) !== "undefined") {
            this.onload = onload;
        }

        if (switchToLoadState === true) {
            // swith to the loading screen
            state.change(state.LOADING);
        }

        // check load status
        checkLoadStatus(onload);
    },

    /**
     * Load a single resource (to be used if you need to load additional resource during the game)
     * @name load
     * @memberof me.loader
     * @public
     * @function
     * @param {object} res
     * @param {string} res.name internal name of the resource
     * @param {string} res.type  "audio", binary", "image", "json", "tmx", "tsx"
     * @param {string} res.src  path and/or file name of the resource (for audio assets only the path is required)
     * @param {boolean} [res.stream] Set to true to force HTML5 Audio, which allows not to wait for large file to be downloaded before playing.
     * @param {Function} onload function to be called when the resource is loaded
     * @param {Function} onerror function to be called in case of error
     * @returns {number} the amount of corresponding resource to be preloaded
     * @example
     * // load an image asset
     * me.loader.load({name: "avatar",  type:"image",  src: "data/avatar.png"}, this.onload.bind(this), this.onerror.bind(this));
     *
     * // start loading music
     * me.loader.load({
     *     name   : "bgmusic",
     *     type   : "audio",
     *     src    : "data/audio/"
     * }, function () {
     *     me.audio.play("bgmusic");
     * });
     */
    load(res, onload, onerror) {
        // transform the url if necessary
        if (typeof (baseURL[res.type]) !== "undefined") {
            res.src = baseURL[res.type] + res.src;
        }
        // check ressource type
        switch (res.type) {
            case "binary":
                // reuse the preloadImage fn
                preloadBinary.call(this, res, onload, onerror);
                return 1;

            case "image":
                // reuse the preloadImage fn
                preloadImage.call(this, res, onload, onerror);
                return 1;

            case "json":
                preloadJSON.call(this, res, onload, onerror);
                return 1;

            case "js":
                preloadJavascript.call(this, res, onload, onerror);
                return 1;

            case "tmx":
            case "tsx":
                preloadTMX.call(this, res, onload, onerror);
                return 1;

            case "audio":
                audio.load(res, !!res.stream, onload, onerror);
                return 1;

            case "fontface":
                preloadFontFace.call(this, res, onload, onerror);
                return 1;

            default:
                throw new Error("load : unknown or invalid resource type : " + res.type);
        }
    },

    /**
     * unload specified resource to free memory
     * @name unload
     * @memberof me.loader
     * @public
     * @function
     * @param {object} res
     * @returns {boolean} true if unloaded
     * @example me.loader.unload({name: "avatar",  type:"image",  src: "data/avatar.png"});
     */
    unload(res) {
        switch (res.type) {
            case "binary":
                if (!(res.name in binList)) {
                    return false;
                }

                delete binList[res.name];
                return true;

            case "image":
                if (!(res.name in imgList)) {
                    return false;
                }
                delete imgList[res.name];
                return true;

            case "json":
                if (!(res.name in jsonList)) {
                    return false;
                }

                delete jsonList[res.name];
                return true;

            case "js":
                // ??
                return true;

            case "fontface":
                // ??
                return true;

            case "tmx":
            case "tsx":
                if (!(res.name in tmxList)) {
                    return false;
                }

                delete tmxList[res.name];
                return true;

            case "audio":
                return audio.unload(res.name);

            default:
                throw new Error("unload : unknown or invalid resource type : " + res.type);
        }
    },

    /**
     * unload all resources to free memory
     * @name unloadAll
     * @memberof me.loader
     * @public
     * @function
     * @example me.loader.unloadAll();
     */
    unloadAll() {
        var name;

        // unload all binary resources
        for (name in binList) {
            if (binList.hasOwnProperty(name)) {
                this.unload({
                    "name" : name,
                    "type" : "binary"
                });
            }
        }

        // unload all image resources
        for (name in imgList) {
            if (imgList.hasOwnProperty(name)) {
                this.unload({
                    "name" : name,
                    "type" : "image"
                });
            }
        }

        // unload all tmx resources
        for (name in tmxList) {
            if (tmxList.hasOwnProperty(name)) {
                this.unload({
                    "name" : name,
                    "type" : "tmx"
                });
            }
        }

        // unload all in json resources
        for (name in jsonList) {
            if (jsonList.hasOwnProperty(name)) {
                this.unload({
                    "name" : name,
                    "type" : "json"
                });
            }
        }

        // unload all audio resources
        audio.unloadAll();
    },

    /**
     * return the specified TMX/TSX object
     * @name getTMX
     * @memberof me.loader
     * @public
     * @function
     * @param {string} elt name of the tmx/tsx element ("map1");
     * @returns {object} requested element or null if not found
     */
    getTMX(elt) {
        // force as string
        elt = "" + elt;
        if (elt in tmxList) {
            return tmxList[elt];
        }
        return null;
    },

    /**
     * return the specified Binary object
     * @name getBinary
     * @memberof me.loader
     * @public
     * @function
     * @param {string} elt name of the binary object ("ymTrack");
     * @returns {object} requested element or null if not found
     */
    getBinary(elt) {
        // force as string
        elt = "" + elt;
        if (elt in binList) {
            return binList[elt];
        }
        return null;
    },

    /**
     * return the specified Image Object
     * @name getImage
     * @memberof me.loader
     * @public
     * @function
     * @param {string} image name of the Image element ("tileset-platformer");
     * @returns {HTMLImageElement} requested element or null if not found
     */
    getImage(image) {
        // force as string and extract the base name
        image = fileUtil.getBasename("" + image);
        if (image in imgList) {
            // return the corresponding Image object
            return imgList[image];
        }
        return null;
    },

    /**
     * return the specified JSON Object
     * @name getJSON
     * @memberof me.loader
     * @public
     * @function
     * @param {string} elt name of the json file to load
     * @returns {object}
     */
    getJSON(elt) {
        // force as string
        elt = "" + elt;
        if (elt in jsonList) {
            return jsonList[elt];
        }
        return null;
    }

};

export default loader;
