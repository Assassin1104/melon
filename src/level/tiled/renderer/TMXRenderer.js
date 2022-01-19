/* eslint-disable no-unused-vars */

import pool from "./../../../system/pooling.js";
import TMXLayer from "./../TMXLayer.js";
import Bounds from "./../../../physics/Bounds.js";

/**
 * @classdesc
 * The map renderer base class
 * @class TMXRenderer
 * @memberof me
 * @param {number} cols width of the tilemap in tiles
 * @param {number} rows height of the tilemap in tiles
 * @param {number} tilewidth width of each tile in pixels
 * @param {number} tileheight height of each tile in pixels
 */
class TMXRenderer {

    constructor(cols, rows, tilewidth, tileheight) {
        this.cols = cols;
        this.rows = rows;
        this.tilewidth = tilewidth;
        this.tileheight = tileheight;
        this.bounds = new Bounds();
    }

    /**
     * return true if the renderer can render the specified map or layer
     * @name me.TMXRenderer#canRender
     * @public
     * @function
     * @param {me.TMXTileMap|me.TMXLayer} component TMX Map or Layer
     * @returns {boolean}
     */
    canRender(component) {
        return (
            /*
            // layers can have different size within
            // the same maps, so commenting these two lines
            (this.cols === component.cols) &&
            (this.rows === component.rows) &&
            */
            (this.tilewidth === component.tilewidth) &&
            (this.tileheight === component.tileheight)
        );
    }

    /**
     * return the bounding rect for this map renderer
     * @name me.TMXRenderer#getBounds
     * @public
     * @function
     * @param {me.TMXLayer} [layer] calculate the bounding rect for a specific layer (will return a new bounds object)
     * @returns {me.Bounds}
     */
    getBounds(layer) {
        var bounds = layer instanceof TMXLayer ? pool.pull("Bounds") : this.bounds;
        bounds.setMinMax(
            0, 0,
            this.cols * this.tilewidth,
            this.rows * this.tileheight
        );
        return bounds;
    }

    /**
     * return the tile position corresponding to the specified pixel
     * @name me.TMXRenderer#pixelToTileCoords
     * @public
     * @function
     * @param {number} x X coordinate
     * @param {number} y Y coordinate
     * @param {me.Vector2d} [v] an optional vector object where to put the return values
     * @returns {me.Vector2d}
     */
    pixelToTileCoords(x, y, v) {
        return v;
    }

    /**
     * return the pixel position corresponding of the specified tile
     * @name me.TMXRenderer#tileToPixelCoords
     * @public
     * @function
     * @param {number} col tile horizontal position
     * @param {number} row tile vertical position
     * @param {me.Vector2d} [v] an optional vector object where to put the return values
     * @returns {me.Vector2d}
     */
    tileToPixelCoords(col, row, v) {
        return v;
    }

    /**
     * draw the given tile at the specified layer
     * @name me.TMXRenderer#drawTile
     * @public
     * @function
     * @param {me.CanvasRenderer|me.WebGLRenderer} renderer a renderer object
     * @param {number} x X coordinate where to draw the tile
     * @param {number} y Y coordinate where to draw the tile
     * @param {me.Tile} tile the tile object to draw
     */
    drawTile(renderer, x, y, tile) {
    }

    /**
     * draw the given TMX Layer for the given area
     * @name me.TMXRenderer#drawTileLayer
     * @public
     * @function
     * @param {me.CanvasRenderer|me.WebGLRenderer} renderer a renderer object
     * @param {me.TMXLayer} layer a TMX Layer object
     * @param {me.Rect} rect the area of the layer to draw
     */
    drawTileLayer(renderer, layer, rect) {
    }

};

export default TMXRenderer;

/* eslint-enable no-unused-vars */
