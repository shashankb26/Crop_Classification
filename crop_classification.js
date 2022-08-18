Map.addLayer(table, {}, "table")

var soybean = table.geometry()
Map.addLayer(soybean, { color: 'blue' }, 'soybean', 0)
var maize = table.geometry()
Map.addLayer(maize, { color: 'red' }, 'maize', 0)
var cotton = table.geometry()
Map.addLayer(cotton, { color: 'green' }, 'cotton', 0)


// Map.addLayer(crop_mask, {}, 'image')
var classification_masker = function (image) {
    var mask1 = crop_mask.eq(1);
    return image.updateMask(mask1);
}
// Export the FeatureCollection to a KML file.
// var export_fun=function(in_features,name){
// Export.table.toDrive({
//   collection: in_features,
//   description:name,
//   fileFormat: 'shp'
// });
// }

// export_fun(Soybean,"Soybean")
// export_fun(Maize,"Maize")
// export_fun(Cotton,"Cotton")

function maskS2clouds(image) {
    var qa = image.select('QA60');
    // Bits 10 and 11 are clouds and cirrus, respectively.
    var cloudBitMask = 1 << 10;
    var cirrusBitMask = 1 << 11;
    // Both flags should be set to zero, indicating clear conditions.
    var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
        .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
    return image.updateMask(mask);
}

var S2 = ee.ImageCollection('COPERNICUS/S2')
    .filterBounds(aoi)
    // .filterBounds(Map.getBounds(true))
    .filterDate('2021-07-01', '2021-10-31')
    .filterBounds(aoi)
    .map(maskS2clouds)
    .map(classification_masker);

Map.addLayer(aoi, {}, "AOI", 0);
Map.centerObject(aoi, 9)

var bands_select = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12']
var medianpixels = S2.median()
var medianpixelsclipped = medianpixels.clip(aoi).select(bands_select)
// print(medianpixelsclipped)
Map.addLayer(medianpixelsclipped, { bands: ['B8', 'B4', 'B3'], min: 0, max: 4000, gamma: 1.5 }, 'Sentinel_2 mosaic', 0)
// Map.addLayer(aoi, {}, 'Jhabua', true);
//Map.addLayer(table, {color: 'red'}, 'Jhabua_csv', true);
// print(S2)

var meanpixels = S2.mean()
var meanpixelsclipped = meanpixels.clip(aoi).select(bands_select)
// Map.addLayer(meanpixelsclipped, {bands: ['B8', 'B4', 'B3'], min: 0, max: 4000, gamma: 1.5}, 'Sentinel_2 mean')
var maxpixels = S2.max()
var maxpixelsclipped = maxpixels.clip(aoi).select(bands_select)
// Map.addLayer(maxpixelsclipped, {bands: ['B8', 'B4', 'B3'], min: 0, max: 4000, gamma: 1.5}, 'Sentinel_2 max')


var minpixels = S2.min()
var minpixelsclipped = minpixels.clip(aoi).select(bands_select)
// Map.addLayer(minpixelsclipped, {bands: ['B8', 'B4', 'B3'], min: 0, max: 4000, gamma: 1.5}, 'Sentinel_2 min')

// var medianstacked=medianpixelsclipped.addBands(meanpixelsclipped)
// print(medianstacked)
var nir = medianpixelsclipped.select('B8');
var red = medianpixelsclipped.select('B4');
var ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI');
print(ndvi, "ndvi")
var palette = ["a50026", "d73027", "f46d43", "fdae61", "fee08b", "d9ef8b", "a6d96a", "66bd63", "1a9850", "006837"];
Map.addLayer(ndvi, { min: 0, max: 1, palette: palette }, 'NDVI image');

var nir = medianpixelsclipped.select('B8');
var green = medianpixelsclipped.select('B3');
var ndwi = green.subtract(nir).divide(green.add(nir)).rename('NDWI');
print(ndwi, "ndwi")
var wbi_function = function (image) {
    var wbi = image.expression(
        '1.07*(blue)-0.68*(green)-0.24*(red)+0.17*(re1)-0.04*(re2)+0.39*(re3)+0.04*(nir)+0.36*(nira)-0.01*(swir1)-0.04*(swir2)', {
        'blue': image.select('B2'),
        'green': image.select('B3'),
        'red': image.select('B4'),
        're1': image.select('B5'),
        're2': image.select('B6'),
        're3': image.select('B7'),
        'nir': image.select('B8'),
        'nira': image.select('B8A'),
        'swir1': image.select('B11'),
        'swir2': image.select('B12'),
    }).rename('wbi');
    return image.addBands(wbi);
}
var s2_indices = S2.map(wbi_function)
var wbi = s2_indices.select("wbi")
print(wbi)
Map.addLayer(wbi, { min: 0, max: 1, palette: ["a50026", "d73027", "f46d43", "fdae61", "fee08b", "d9ef8b", "a6d96a", "66bd63", "1a9850", "006837"] }, "WBI");


var RVI_function = function (image) {
    var RVI = image.expression(
        'B08/B04', {
        'B08': image.select('B8'),
        'B04': image.select('B4')

    }).rename('RVI');
    return image.addBands(RVI);
}
var s2_indices = S2.map(RVI_function)
var RVI = s2_indices.select("RVI")
print(RVI)
Map.addLayer(RVI, { min: 0, max: 1, palette: ["a50026", "d73027", "f46d43", "fdae61", "fee08b", "d9ef8b", "a6d96a", "66bd63", "1a9850", "006837"] }, "RVI");

var savi = S2.map(function (image) {
    return image.select().addBands(image.expression(
        '(1 + L) * ((NIR - RED) / (NIR + RED + L))', {
        'NIR': image.select('B8'),
        'RED': image.select('B4'),
        'L': 0.5
    }).float()).rename('SAVI')
});


// var s2_selected_bands=S2.select(['B2','B3','B4','B5','B6','B7','B8','B9','B10','B11'])

// var b3_mean=S2.select(["B3"]).mean()

var stackCollection = function (collection) {
    // Create an initial image.
    var first = ee.Image(collection.first()).select([]);

    // Write a function that appends a band to an image.
    var appendBands = function (image, previous) {
        return ee.Image(previous).addBands(image);
    };
    return ee.Image(collection.iterate(appendBands, first));
};
//var collection_for_stack=ee.ImageCollection(meanpixelsclipped).merge(ee.ImageCollection(maxpixelsclipped)).merge(ee.ImageCollection(minpixelsclipped)).merge(ee.ImageCollection(medianpixelsclipped)).merge(ee.ImageCollection(ndvi)).merge(ee.ImageCollection(savi)).merge(ee.ImageCollection(ndwi))
var collection_for_stack = (ee.ImageCollection(medianpixelsclipped)).merge(ee.ImageCollection(ndvi)).merge(ee.ImageCollection(ndwi)).merge(ee.ImageCollection(savi))
// var stacked = stackCollection(collection_for_stack);
var stacked = stackCollection(collection_for_stack);
// print('stacked image', stacked);

// Display the first band of the stacked image.
// Map.addLayer(stacked.clip(aoi), {min:0, max:0.3}, 'stacked');


var JhabuaImageCount = S2.size();
// print('Number of images available are ',JhabuaImageCount);
var JhabuaImageFull = ee.Image(S2.first());
// print(JhabuaImageFull);
// var ColorPaletteFcc={bands:['B8', 'B4', 'B3'],min:0,max:6000};
// var ColorPaletteTrue={bands:['B4','B3','B2'],min:0,max:3000};
// Map.addLayer(JhabuaImageFull,ColorPaletteFcc,'False Color');
var clipImage = ee.Image(stacked.clip(aoi));
// Map.addLayer(aoi);
// Map.addLayer(clipImage, {bands: ['B8', 'B4', 'B3'], min: 0, max: 3000, gamma: 1.5}, 'clip');


// // var combinedFeatureCollection = Forest.merge(Builtup).merge(Water).merge(Barren);
// // var otherClass=combinedFeatureCollection.map(function(feature){
// //     return feature.set('Landcover', 1);
// //   });
// // print(otherClass)


// var newfc = soybean.merge(maize).merge(cotton)
// //var newfc = otherClass.merge(Soybean).merge(Maize).merge(Cotton);
// print(newfc, 'newfc')
var bands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12'];


var trainingSamples = clipImage.select(bands).sampleRegions({ collection: newfc, properties: ['Landcover'], scale: 10 });
/*
// print(trainingSamples)
//trainingSamples = trainingSamples.set('Soybean', 1);
var classifierTrain = ee.Classifier.smileRandomForest(4).train({features:trainingSamples,classProperty:'Landcover',inputProperties:bands});
var ClassifiedImage=clipImage.select(bands).classify(classifierTrain);
Map.addLayer(ClassifiedImage,{min:1,max:4,palette:['#ffffff','#e44fff','#f0b531','#901313']},'Random Forest');
print(ClassifiedImage)



// // Export the image, specifying scale and region.
Export.image.toDrive({
  image: ClassifiedImage,
  description: 'Crop Classification Jhabua',
  scale: 10,
  maxPixels: 3784216672400,
  region: aoi
});


var training = clipImage.select(bands).sampleRegions({
  collection: newfc,
  properties: ['Landcover'],
  scale: 10
});

// Train a CART classifier.
var classifier = ee.Classifier.smileCart().train({
  features: training,
  classProperty: 'Landcover',
});
// Print some info about the classifier (specific to CART).
print('CART, explained', classifier.explain());
// Classify the composite.
var classified = clipImage.classify(classifier);
Map.centerObject(newfc);
Map.addLayer(classified, {min: 1, max: 4, palette: ['#ffffff','#d63000','#f2d924','#901313']});
// Optionally, do some accuracy assessment.  Fist, add a column of
// random uniforms to the training dataset.
var withRandom = training.randomColumn('random');
// We want to reserve some of the data for testing, to avoid overfitting the model.
var split = 0.7;  // Roughly 70% training, 30% testing.
var trainingPartition = withRandom.filter(ee.Filter.lt('random', split));
var testingPartition = withRandom.filter(ee.Filter.gte('random', split));
// Trained with 70% of our data.
var trainedClassifier = ee.Classifier.smileRandomForest(4).train({
  features: trainingPartition,
  classProperty: 'Landcover',
  inputProperties: bands
});
// Classify the test FeatureCollection.
var test = testingPartition.classify(trainedClassifier);
// Print the confusion matrix.
var confusionMatrix = test.errorMatrix('Landcover', 'classification');
print('Confusion Matrix', confusionMatrix);
var OA = confusionMatrix.accuracy()
var CA = confusionMatrix.consumersAccuracy()
var Kappa = confusionMatrix.kappa()
var Order = confusionMatrix.order()
var PA = confusionMatrix.producersAccuracy()
//print(confMatrix,'Confusion Matrix')
print(OA,'Overall Accuracy')
print(CA,'Consumers Accuracy')
print(Kappa,'Kappa')
print(Order,'Order')
print(PA,'Producers Accuracy')


var outputBucket = "yourBucket";
var trainFilePrefix = "Jhabua/trainFile";
var testFilePrefix = "Jhabua/testFile";
// Create the tasks.
Export.table.toCloudStorage({
collection:trainingPartition,
description:'Training_Export',
fileNamePrefix:trainFilePrefix,
bucket:outputBucket,
fileFormat:'TFRecord'});
 
Export.table.toCloudStorage({
collection:testingPartition,
description:'Testing_Export',
fileNamePrefix:testFilePrefix,
bucket:outputBucket,
fileFormat:'TFRecord'});





// var geometry=table2.geometry()
// //Map.addLayer(geometry,{},"geometry")
// var Soybean = table2.filterMetadata("field_8","equals","Soybean")
// Map.addLayer(Soybean,{color : 'blue'},"Soybean")
// print(Soybean,"soyabean")
// var Maize = table2.filterMetadata("field_8","equals","Maize")
// Map.addLayer(Maize,{color : 'red'},"Maize")
// print(Maize,"Maize")
// var Cotton = table2.filterMetadata("field_8","equals","Cotton")
// Map.addLayer(Cotton,{color : 'green'},"Cotton")
// print(Cotton,"Cotton")
*/
