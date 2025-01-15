/**
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  Derived from logic of https://github.com/M-Reimer/gpx2geojson/tree/master
 */

/**
 * @desc The Gpx namespace.
 * @namespace
 * @global
 */
var Gpx = (function() {

  // Define the Gpx constructor
  function Gpx(obj) {
    if (obj instanceof Gpx) return obj;
    if (!(this instanceof Gpx)) return new Gpx(obj);
    this._wrapped = obj;
  }

  /**
   * @desc Parses GPX text and returns an XML Document.
   * @param {String} gpxText - The GPX data as a string.
   * @return {Document} Parsed XML Document.
   */
  Gpx.prototype.read = function(gpxText) {
    return new DOMParser().parseFromString(gpxText, "application/xml");
  };

  /**
   * @desc Converts an XML Document to GeoJSON FeatureCollection.
   * @param {Document} document - Parsed XML document of GPX data.
   * @return {Object} GeoJSON FeatureCollection.
   */
  Gpx.prototype.toGeoJSON = function(document) {
    const features = [];
    for (const n of document.firstChild.childNodes) {
      switch (n.tagName) {
        case "wpt":
          features.push(this.wptToPoint(n));
          break;
        case "trk":
          features.push(this.trkToMultiLineString(n));
          break;
        case "rte":
          features.push(this.rteToLineString(n));
          break;
      }
    }
    return {
      type: "FeatureCollection",
      features: features
    };
  };

  /**
   * @desc Extracts coordinates from a node.
   * @param {Node} node - GPX node containing coordinates.
   * @return {Array} Array of coordinates [longitude, latitude].
   */
  Gpx.prototype.coordFromNode = function(node) {
    return [
      parseFloat(node.getAttribute("lon")),
      parseFloat(node.getAttribute("lat"))
    ];
  };

  /**
   * @desc Creates a GeoJSON feature.
   * @param {String} type - Type of geometry (Point, LineString, etc.).
   * @param {Array} coords - Coordinates for the geometry.
   * @param {Object} props - Properties of the feature.
   * @return {Object} GeoJSON feature.
   */
  Gpx.prototype.makeFeature = function(type, coords, props) {
    return {
      type: "Feature",
      geometry: {
        type: type,
        coordinates: coords
      },
      properties: props
    };
  };

  /**
   * @desc Converts a waypoint node to a GeoJSON Point feature.
   * @param {Node} node - GPX waypoint node.
   * @return {Object} GeoJSON Point feature.
   */
  Gpx.prototype.wptToPoint = function(node) {
    const coord = this.coordFromNode(node);
    const props = this.extractProperties(node);
    return this.makeFeature("Point", coord, props);
  };

  /**
   * @desc Converts a track node to a GeoJSON MultiLineString feature.
   * @param {Node} node - GPX track node.
   * @return {Object} GeoJSON MultiLineString feature.
   */
  Gpx.prototype.trkToMultiLineString = function(node) {
    const coordslst = [];
    const props = this.extractProperties(node);
    for (const n of node.childNodes) {
      if (n.tagName === "trkseg") {
        const coords = [];
        coordslst.push(coords);
        for (const trkpt of n.getElementsByTagName("trkpt")) {
          coords.push(this.coordFromNode(trkpt));
        }
      }
    }
    return this.makeFeature("MultiLineString", coordslst, props);
  };

  /**
   * @desc Converts a route node to a GeoJSON LineString feature.
   * @param {Node} node - GPX route node.
   * @return {Object} GeoJSON LineString feature.
   */
  Gpx.prototype.rteToLineString = function(node) {
    const coords = [];
    const props = this.extractProperties(node);
    for (const n of node.childNodes) {
      if (n.tagName === "rtept") {
        coords.push(this.coordFromNode(n));
      }
    }
    return this.makeFeature("LineString", coords, props);
  };

  /**
   * @desc Extracts properties from a GPX node.
   * @param {Node} node - GPX node.
   * @return {Object} Properties extracted from the node.
   */
  Gpx.prototype.extractProperties = function(node) {
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
          props[`extension_${ext.tagName}`] = ext.textContent;
        }
      }
    }
    return props;
  };

  return Gpx;  // Return the Gpx constructor
})();
