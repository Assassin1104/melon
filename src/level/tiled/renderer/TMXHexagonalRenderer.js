import Vector2d from "./../../../math/vector2.js";
import pool from "./../../../system/pooling.js";
import TMXRenderer from "./TMXRenderer.js";
import TMXLayer from "./../TMXLayer.js";



// scope global var & constants
var offsetsStaggerX = [
    {x:   0, y:   0},
    {x: + 1, y: - 1},
    {x: + 1, y:   0},
    {x: + 2, y:   0}
];
var offsetsStaggerY = [
    {x:   0, y:   0},
    {x: - 1, y: + 1},
    {x:   0, y: + 1},
    {x:   0, y: + 2}
];

/**
 * @classdesc
 * an Hexagonal Map Renderder
 * @class TMXHexagonalRenderer
 * @memberof me
 * @augments me.TMXRenderer
 * @param {me.TMXTileMap} map the TMX map
 */
class TMXHexagonalRenderer extends TMXRenderer {
    // constructor
    constructor(map) {
        super(
            map.cols,
            map.rows,
            map.tilewidth & ~1,
            map.tileheight & ~1
        );

        this.hexsidelength = map.hexsidelength || 0;
        this.staggerX = map.staggeraxis === "x";
        this.staggerEven = map.staggerindex === "even";

        this.sidelengthx = 0;
        this.sidelengthy = 0;

        if (map.orientation === "hexagonal") {
            if (this.staggerX) {
                this.sidelengthx = this.hexsidelength;
            }
            else {
                this.sidelengthy = this.hexsidelength;
            }
        }

        this.sideoffsetx = (this.tilewidth - this.sidelengthx) / 2;
        this.sideoffsety = (this.tileheight - this.sidelengthy) / 2;

        this.columnwidth = this.sideoffsetx + this.sidelengthx;
        this.rowheight = this.sideoffsety + this.sidelengthy;

        this.centers = [
            new Vector2d(),
            new Vector2d(),
            new Vector2d(),
            new Vector2d()
        ];
    }

    /**
     * return true if the renderer can render the specified layer
     * @ignore
     */
    canRender(layer) {
        return (
            (layer.orientation === "hexagonal") &&
            super.canRender(layer)
        );
    }

    /**
     * return the bounding rect for this map renderer
     * @name me.TMXHexagonalRenderer#getBounds
     * @public
     * @function
     * @param {me.TMXLayer} [layer] calculate the bounding rect for a specific layer (will return a new bounds object)
     * @returns {me.Bounds}
     */
    getBounds(layer) {
        var bounds = layer instanceof TMXLayer ? pool.pull("Bounds") : this.bounds;

        // The map size is the same regardless of which indexes are shifted.
        if (this.staggerX) {
            bounds.setMinMax(
                0, 0,
                this.cols * this.columnwidth + this.sideoffsetx,
                this.rows * (this.tileheight + this.sidelengthy)
            );
            if (bounds.width > 1) {
                bounds.height += this.rowheight;
            }
        } else {
            bounds.setMinMax(
                0, 0,
                this.cols * (this.tilewidth + this.sidelengthx),
                this.rows * this.rowheight + this.sideoffsety
            );
            if (bounds.height > 1) {
                bounds.width += this.columnwidth;
            }
        }
        return bounds;
    }

    /**
     * @ignore
     */
    doStaggerX (x) {
        return this.staggerX && (x & 1) ^ this.staggerEven;
    }

    /**
     * @ignore
     */
    doStaggerY(y) {
        return !this.staggerX && (y & 1) ^ this.staggerEven;
    }

    /**
     * @ignore
     */
    topLeft(x, y, v) {
        var ret = v || new Vector2d();

        if (!this.staggerX) {
            if ((y & 1) ^ this.staggerEven) {
                ret.set(x, y - 1);
            }
            else {
                ret.set(x - 1, y - 1);
            }
        } else {
            if ((x & 1) ^ this.staggerEven) {
                ret.set(x - 1, y);
            }
            else {
                ret.set(x - 1, y - 1);
            }
        }
        return ret;
    }

    /**
     * @ignore
     */
    topRight(x, y, v) {
        var ret = v || new Vector2d();

        if (!this.staggerX) {
            if ((y & 1) ^ this.staggerEven) {
                ret.set(x + 1, y - 1);
            }
            else {
                ret.set(x, y - 1);
            }
        } else {
            if ((x & 1) ^ this.staggerEven) {
                ret.set(x + 1, y);
            }
            else {
                ret.set(x + 1, y - 1);
            }
        }
        return ret;
    }


    /**
     * @ignore
     */
    bottomLeft(x, y, v) {
        var ret = v || new Vector2d();

        if (!this.staggerX) {
            if ((y & 1) ^ this.staggerEven) {
                ret.set(x, y + 1);
            }
            else {
                ret.set(x - 1, y + 1);
            }
        } else {
            if ((x & 1) ^ this.staggerEven) {
                ret.set(x -1, y + 1);
            }
            else {
                ret.set(x -1, y);
            }
        }
        return ret;
    }

    /**
     * @ignore
     */
    bottomRight(x, y, v) {
        var ret = v || new Vector2d();

        if (!this.staggerX) {
            if ((y & 1) ^ this.staggerEven) {
                ret.set(x + 1, y + 1);
            }
            else {
                ret.set(x, y + 1);
            }
        } else {
            if ((x & 1) ^ this.staggerEven) {
                ret.set(x + 1, y + 1);
            }
            else {
                ret.set(x + 1, y);
            }
        }
        return ret;
    }

    /**
     * return the tile position corresponding to the specified pixel
     * @ignore
     */
    pixelToTileCoords(x, y, v) {
        var ret = v || new Vector2d();

        if (this.staggerX) { //flat top
            x -= this.staggerEven ? this.tilewidth : this.sideoffsetx;
        }
        else { //pointy top
            y -= this.staggerEven ? this.tileheight : this.sideoffsety;
        }

        // Start with the coordinates of a grid-aligned tile
        var referencePoint = pool.pull("Vector2d",
            Math.floor(x / (this.columnwidth * 2)),
            Math.floor((y / (this.rowheight * 2)))
        );

        // Relative x and y position on the base square of the grid-aligned tile
        var rel = pool.pull("Vector2d",
            x - referencePoint.x * (this.columnwidth * 2),
            y - referencePoint.y * (this.rowheight * 2)
        );

        // Adjust the reference point to the correct tile coordinates
        if (this.staggerX) {
            referencePoint.x = referencePoint.x * 2;
            if (this.staggerEven) {
                ++referencePoint.x;
            }
        }
        else {
            referencePoint.y = referencePoint.y * 2;
            if (this.staggerEven) {
                ++referencePoint.y;
            }
        }

        // Determine the nearest hexagon tile by the distance to the center
        var left, top, centerX, centerY;
        if (this.staggerX) {
            left = this.sidelengthx / 2;
            centerX = left + this.columnwidth;
            centerY = this.tileheight / 2;

            this.centers[0].set(left, centerY);
            this.centers[1].set(centerX, centerY - this.rowheight);
            this.centers[2].set(centerX, centerY + this.rowheight);
            this.centers[3].set(centerX + this.columnwidth, centerY);
        }
        else {
            top = this.sidelengthy / 2;
            centerX = this.tilewidth / 2;
            centerY = top + this.rowheight;

            this.centers[0].set(centerX, top);
            this.centers[1].set(centerX - this.columnwidth, centerY);
            this.centers[2].set(centerX + this.columnwidth, centerY);
            this.centers[3].set(centerX, centerY + this.rowheight);
        }

        var nearest = 0;
        var minDist = Number.MAX_VALUE;
        for (var i = 0; i < 4; ++i) {
            var dc = this.centers[i].sub(rel).length2();
            if (dc < minDist) {
                minDist = dc;
                nearest = i;
            }
        }

        var offsets = (this.staggerX) ? offsetsStaggerX : offsetsStaggerY;

        ret.set(
            referencePoint.x + offsets[nearest].x,
            referencePoint.y + offsets[nearest].y
        );

        pool.push(referencePoint);
        pool.push(rel);

        return ret;
    }

    /**
     * return the pixel position corresponding of the specified tile
     * @ignore
     */
    tileToPixelCoords(x, y, v) {
        var tileX = Math.floor(x),
            tileY = Math.floor(y);
        var ret = v || new Vector2d();

        if (this.staggerX) {
            ret.y = tileY * (this.tileheight + this.sidelengthy);
            if (this.doStaggerX(tileX)) {
                ret.y += this.rowheight;
            }
            ret.x = tileX * this.columnwidth;
        } else {
            ret.x = tileX * (this.tilewidth + this.sidelengthx);
            if (this.doStaggerY(tileY)) {
                ret.x += this.columnwidth;
            }
            ret.y = tileY * this.rowheight;
        }

        return ret;
    }

    /**
     * fix the position of Objects to match
     * the way Tiled places them
     * @ignore
     */
    adjustPosition(obj) {
        // only adjust position if obj.gid is defined
        if (typeof(obj.gid) === "number") {
            // Tiled objects origin point is "bottom-left" in Tiled,
            // "top-left" in melonJS)
            obj.y -= obj.height;
        }
    }

    /**
     * draw the tile map
     * @ignore
     */
    drawTile(renderer, x, y, tmxTile) {
        var tileset = tmxTile.tileset;
        var point = this.tileToPixelCoords(x, y, pool.pull("Vector2d"));

        // draw the tile
        tileset.drawTile(
            renderer,
            tileset.tileoffset.x + point.x,
            tileset.tileoffset.y + point.y + (this.tileheight - tileset.tileheight),
            tmxTile
        );

        pool.push(point);
    }

    /**
     * draw the tile map
     * @ignore
     */
    drawTileLayer(renderer, layer, rect) {
        var tile;

        // get top-left and bottom-right tile position
        var startTile = this.pixelToTileCoords(
            rect.pos.x,
            rect.pos.y,
            pool.pull("Vector2d")
        );

        // Compensate for the layer position
        startTile.sub(layer.pos);

        // get top-left and bottom-right tile position
        var startPos = this.tileToPixelCoords(
            startTile.x + layer.pos.x,
            startTile.y + layer.pos.y,
            pool.pull("Vector2d")
        );

        var rowTile = startTile.clone();
        var rowPos = startPos.clone();

       /* Determine in which half of the tile the top-left corner of the area we
        * need to draw is. If we're in the upper half, we need to start one row
        * up due to those tiles being visible as well. How we go up one row
        * depends on whether we're in the left or right half of the tile.
        */
        var inUpperHalf = rect.pos.y - startPos.y < this.sideoffsety;
        var inLeftHalf = rect.pos.x - startPos.x < this.sideoffsetx;

        if (inUpperHalf) {
            startTile.y--;
        }
        if (inLeftHalf) {
            startTile.x--;
        }

        var endX = layer.cols;
        var endY = layer.rows;

        if (this.staggerX) {
            //ensure we are in the valid tile range
            startTile.x = Math.max(0, startTile.x);
            startTile.y = Math.max(0, startTile.y);

            startPos = this.tileToPixelCoords(
                startTile.x + layer.pos.x,
                startTile.y + layer.pos.y
            );

            var staggeredRow = this.doStaggerX(startTile.x + layer.pos.x);

            // main drawing loop
            for (; startPos.y < rect.bottom && startTile.y < endY; ) {
                rowTile.setV(startTile);
                rowPos.setV(startPos);

                for (; rowPos.x < rect.right && rowTile.x < endX; rowTile.x+=2) {
                    tile = layer.cellAt(rowTile.x, rowTile.y, false);
                    if (tile) {
                        // draw the tile
                        tile.tileset.drawTile(renderer, rowPos.x, rowPos.y, tile);
                    }
                    rowPos.x += this.tilewidth + this.sidelengthx;
                }

                if (staggeredRow) {
                    startTile.x -= 1;
                    startTile.y += 1;
                    startPos.x -= this.columnwidth;
                    staggeredRow = false;
                } else {
                    startTile.x += 1;
                    startPos.x += this.columnwidth;
                    staggeredRow = true;
                }

                startPos.y += this.rowheight;
            }
            pool.push(rowTile);
            pool.push(rowPos);

        } else {
            //ensure we are in the valid tile range
            startTile.x = Math.max(0, startTile.x);
            startTile.y = Math.max(0, startTile.y);

            startPos = this.tileToPixelCoords(
                startTile.x + layer.pos.x,
                startTile.y + layer.pos.y
            );

            // Odd row shifting is applied in the rendering loop, so un-apply it here
            if (this.doStaggerY(startTile.y)) {
                startPos.x -= this.columnwidth;
            }

            // main drawing loop
            for (; startPos.y < rect.bottom && startTile.y < endY; startTile.y++) {
                rowTile.setV(startTile);
                rowPos.setV(startPos);

                if (this.doStaggerY(startTile.y)) {
                    rowPos.x += this.columnwidth;
                }

                for (; rowPos.x < rect.right && rowTile.x < endX; rowTile.x++) {
                    tile = layer.cellAt(rowTile.x, rowTile.y, false);
                    if (tile) {
                        // draw the tile
                        tile.tileset.drawTile(renderer, rowPos.x, rowPos.y, tile);
                    }
                    rowPos.x += this.tilewidth + this.sidelengthx;
                }
                startPos.y += this.rowheight;
            }
            pool.push(rowTile);
            pool.push(rowPos);
        }

        pool.push(startTile);
        pool.push(startPos);
    }
};

export default TMXHexagonalRenderer;
