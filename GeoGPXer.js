// ==UserScript==
// @name                GeoGPXer
// @namespace           https://github.com/JS55CT
// @description         GeoGPXer is a JavaScript library designed to convert GPX data into GeoJSON format efficiently. It supports the conversion of waypoints, tracks, and routes, with additional handling for GPX extensions.
// @version             1.1.1
// @author              JS55CT
// @license             GNU GPLv3
// @match              *://this-library-is-not-supposed-to-run.com/*
// ==/UserScript==

/***********************************************************
 * ## Project Home < https://github.com/JS55CT/GeoGPXer >
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
 *
 *  V 1.1.1 - Added support for Z or Elevation in output.
**************************************************************/

/**
 * @desc The GeoGPXer namespace.
 * @namespace
 * @global
 */
var GeoGPXer = (function() {

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
  GeoGPXer.prototype.read = function(gpxText) {
    return new DOMParser().parseFromString(gpxText, "application/xml");
  };

  /**
   * @desc Converts an XML Document to GeoJSON FeatureCollection.
   * @param {Document} document - Parsed XML document of GPX data.
   * @param {Boolean} includeElevation - Whether to include elevation data in coordinates.
   * @return {Object} GeoJSON FeatureCollection.
   */
  GeoGPXer.prototype.toGeoJSON = function(document, includeElevation = false) {
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
      features: features
    };
  };

  /**
   * @desc Extracts coordinates from a node.
   * @param {Node} node - GPX node containing coordinates.
   * @param {Boolean} includeElevation - Whether to include elevation data.
   * @return {Array} Array of coordinates [longitude, latitude, elevation].
   */
  GeoGPXer.prototype.coordFromNode = function(node, includeElevation = false) {
    const coords = [
      parseFloat(node.getAttribute("lon")),
      parseFloat(node.getAttribute("lat"))
    ];
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
  GeoGPXer.prototype.makeFeature = function(type, coords, props) {
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
   * @param {Boolean} includeElevation - Whether to include elevation data.
   * @return {Object} GeoJSON Point feature.
   */
  GeoGPXer.prototype.wptToPoint = function(node, includeElevation = false) {
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
  GeoGPXer.prototype.trkToMultiLineString = function(node, includeElevation = false) {
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
  GeoGPXer.prototype.rteToLineString = function(node, includeElevation = false) {
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
  GeoGPXer.prototype.extractProperties = function(node) {
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

  return GeoGPXer;  // Return the GeoGPXer constructor

})();
