import { external } from '../externalModules.js';

export default class FusionRenderer {
  constructor () {
    this.currentImageIdIndex = 0;
    this.layerIds = [];
    this.findImageFn = undefined;
  }

  render (element, imageStacks) {
    // Move this to base Renderer class
    if (!Number.isInteger(this.currentImageIdIndex)) {
      throw new Error('FusionRenderer: render - Image ID Index is not an integer');
    }

    if (!this.findImageFn) {
      throw new Error('No findImage function has been defined');
    }

    // TODO: Figure out what to do with LoadHandlers in this scenario...

    const cornerstone = external.cornerstone;
    // For the base layer, go to the currentImageIdIndex
    const baseImageObject = imageStacks[0];
    const currentImageId = baseImageObject.imageIds[this.currentImageIdIndex];
    const overlayImageStacks = imageStacks.slice(1, imageStacks.length);

    cornerstone.loadAndCacheImage(currentImageId).then((image) => {
      const baseLayerId = this.layerIds[0];
      let baseLayer;

      if (baseLayerId) {
        baseLayer = cornerstone.getLayer(element, baseLayerId);

        if (baseLayer === undefined) {
          return;
        }

        baseLayer.image = Object.assign({}, image);
      } else {
        const layerId = cornerstone.addLayer(element, Object.assign({}, image), baseImageObject.options);

        this.layerIds.push(layerId);

        baseLayer = cornerstone.getLayer(element, baseLayerId);
      }

      cornerstone.displayImage(element, image);

      // Loop through the remaining 'overlay' image stacks
      overlayImageStacks.forEach((imgObj, overlayLayerIndex) => {
        const imageId = this.findImageFn(imgObj.imageIds, currentImageId);
        const layerIndex = overlayLayerIndex + 1;
        const currentLayerId = this.layerIds[layerIndex];
        let layer;

        if (currentLayerId) {
          layer = cornerstone.getLayer(element, currentLayerId);
        } else {
          // If no layer exists yet for this overlaid stack, create
          // One and add it to the layerIds property for this instance
          // Of the fusion renderer.
          const layerId = cornerstone.addLayer(element, undefined, imgObj.options);

          this.layerIds.push(layerId);

          layer = cornerstone.getLayer(element, layerId);
        }

        if (imageId) {
          // If an imageId was returned from the findImage function,
          // Load it, make sure it's visible and update the layer
          // With the new image object.
          cornerstone.loadAndCacheImage(imageId).then((image) => {
            layer.image = Object.assign({}, image);
            cornerstone.rescaleImage(baseLayer, layer);
            cornerstone.updateImage(element, true);
          });
        } else {
          // If no imageId was returned from the findImage function.
          // This means that there is no relevant image to display
          // On this layer. In this case, set the layer to invisible.
          layer.image = undefined;
          cornerstone.updateImage(element, true);
        }
      });
    });
  }
}
