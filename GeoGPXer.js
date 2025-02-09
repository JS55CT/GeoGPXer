// ==UserScript==
// @name                GeoGPXer
// @namespace           https://github.com/JS55CT
// @description         GeoGPXer is a JavaScript library designed to convert GPX data into GeoJSON format efficiently. It supports the conversion of waypoints, tracks, and routes, with additional handling for GPX extensions.
// @version             2.0.0
// @author              JS55CT
// @license             MIT
// @match              *://this-library-is-not-supposed-to-run.com/*
// ==/UserScript==

/***********************************************************
 * ## Project Home < https://github.com/JS55CT/GeoGPXer >
 *  MIT License
 * Copyright (c) 2022 hu de yi
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 *  Derived from logic of https://github.com/M-Reimer/gpx2geojson/tree/master (LGPL-3.0 license)
 **************************************************************/

/**
 * @desc The GeoGPXer namespace.
 * @namespace
 * @global
 */
var GeoGPXer = (function () {
  // Define the GeoGPXer constructor
  function GeoGPXer(obj) {
    if (obj instanceof GeoGPXer) return obj;
    if (!(this instanceof GeoGPXer)) return new GeoGPXer(obj);
    this._wrapped = obj;
  }

  /**
   * @desc Parses GPX text and returns an XML Document.
   * @param {String} gpxText - The GPX data as a string.
   * @return {Document} Parsed XML Document.
   */
  GeoGPXer.prototype.read = function (gpxText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxText, "application/xml");

    // Check for parsing errors by looking for parser error tags
    const parseErrors = xmlDoc.getElementsByTagName("parsererror");
    if (parseErrors.length > 0) {
      // If there are parsing errors, log them and throw an error
      const errorMessages = Array.from(parseErrors)
        .map((errorElement, index) => {
          return `Parsing Error ${index + 1}: ${errorElement.textContent}`;
        })
        .join("\n");

      console.error(errorMessages);
      throw new Error("Failed to parse GPX. See console for details.");
    }

    // If parsing is successful, return the parsed XML document
    return xmlDoc;
  };

  /**
   * @desc Converts an XML Document to GeoJSON FeatureCollection.
   * @param {Document} document - Parsed XML document of GPX data.
   * @param {Boolean} includeElevation - Whether to include elevation data in coordinates.
   * @return {Object} GeoJSON FeatureCollection.
   */
  GeoGPXer.prototype.toGeoJSON = function (document, includeElevation = false) {
    const features = [];
    for (const n of document.firstChild.childNodes) {
      switch (n.tagName) {
        case "wpt":
          features.push(this.wptToPoint(n, includeElevation));
          break;
        case "trk":
          features.push(this.trkToMultiLineString(n, includeElevation));
          break;
        case "rte":
          features.push(this.rteToLineString(n, includeElevation));
          break;
      }
    }
    return {
      type: "FeatureCollection",
      features: features,
    };
  };

  /**
   * @desc Extracts coordinates from a node.
   * @param {Node} node - GPX node containing coordinates.
   * @param {Boolean} includeElevation - Whether to include elevation data.
   * @return {Array} Array of coordinates [longitude, latitude, elevation].
   */
  GeoGPXer.prototype.coordFromNode = function (node, includeElevation = false) {
    const coords = [parseFloat(node.getAttribute("lon")), parseFloat(node.getAttribute("lat"))];
    if (includeElevation) {
      const eleNode = node.getElementsByTagName("ele")[0];
      const elevation = eleNode ? parseFloat(eleNode.textContent) : 0;
      coords.push(elevation);
    }
    return coords;
  };

  /**
   * @desc Creates a GeoJSON feature.
   * @param {String} type - Type of geometry (Point, LineString, etc.).
   * @param {Array} coords - Coordinates for the geometry.
   * @param {Object} props - Properties of the feature.
   * @return {Object} GeoJSON feature.
   */
  GeoGPXer.prototype.makeFeature = function (type, coords, props) {
    return {
      type: "Feature",
      geometry: {
        type: type,
        coordinates: coords,
      },
      properties: props,
    };
  };

  /**
   * @desc Converts a waypoint node to a GeoJSON Point feature.
   * @param {Node} node - GPX waypoint node.
   * @param {Boolean} includeElevation - Whether to include elevation data.
   * @return {Object} GeoJSON Point feature.
   */
  GeoGPXer.prototype.wptToPoint = function (node, includeElevation = false) {
    const coord = this.coordFromNode(node, includeElevation);
    const props = this.extractProperties(node);
    return this.makeFeature("Point", coord, props);
  };

  /**
   * @desc Converts a track node to a GeoJSON MultiLineString feature.
   * @param {Node} node - GPX track node.
   * @param {Boolean} includeElevation - Whether to include elevation data.
   * @return {Object} GeoJSON MultiLineString feature.
   */
  GeoGPXer.prototype.trkToMultiLineString = function (node, includeElevation = false) {
    const coordslst = [];
    const props = this.extractProperties(node);
    for (const n of node.childNodes) {
      if (n.tagName === "trkseg") {
        const coords = [];
        coordslst.push(coords);
        for (const trkpt of n.getElementsByTagName("trkpt")) {
          coords.push(this.coordFromNode(trkpt, includeElevation));
        }
      }
    }
    return this.makeFeature("MultiLineString", coordslst, props);
  };

  /**
   * @desc Converts a route node to a GeoJSON LineString feature.
   * @param {Node} node - GPX route node.
   * @param {Boolean} includeElevation - Whether to include elevation data.
   * @return {Object} GeoJSON LineString feature.
   */
  GeoGPXer.prototype.rteToLineString = function (node, includeElevation = false) {
    const coords = [];
    const props = this.extractProperties(node);
    for (const n of node.childNodes) {
      if (n.tagName === "rtept") {
        coords.push(this.coordFromNode(n, includeElevation));
      }
    }
    return this.makeFeature("LineString", coords, props);
  };

  /**
   * @desc Extracts properties from a GPX node.
   * @param {Node} node - GPX node.
   * @return {Object} Properties extracted from the node.
   */
  GeoGPXer.prototype.extractProperties = function (node) {
    const props = {};
    for (const n of node.childNodes) {
      if (n.nodeType === Node.ELEMENT_NODE && n.tagName !== "extensions") {
        props[n.tagName] = n.textContent;
      }
    }
    const extensions = node.getElementsByTagName("extensions");
    if (extensions.length > 0) {
      for (const ext of extensions[0].childNodes) {
        if (ext.nodeType === Node.ELEMENT_NODE) {
          props[`ex_${ext.tagName}`] = ext.textContent;
        }
      }
    }
    return props;
  };

  return GeoGPXer; // Return the GeoGPXer constructor
})();
