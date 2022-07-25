//============================================================================================
//                                Script by Eric Möller, 2020-21
//============================================================================================
//                              PARAMETER SETTINGS

var satellite = 'Landsat';              //'Sentinel' or 'Landsat' or 'Modis'

//var geometry = ee.Geometry.Rectangle(9.9018, 49.7453, 9.9595, 49.7985); //Otherwise: DRAW-Tools

var month_start = 1;                    //Startmonth of the temporal integration
var month_end = 12;                      //Endmonth of the temporal integration

var year_start = 1980;                  //Startyear of the temporal integration.
var year_end = 2022;                    //Endyear of the temporal integration.

var Date_start = '2022-05-01';          //'YYYY-MM-DD'; Care about the starting year of the satellite
var Date_end = '2022-07-25';            //'YYYY-MM-DD'

var max_cloud_cover = 5;               //Maximum Cloud Cover (on land) for Landsat & Sentinel between 0 and 100

var index = 'NDVI';                     //Choose between: 'NDVI', 'NBR', 'NDWI', 'NDSI' (Landsat & Sentinel), 'LST' (Modis)
var metric = 'median';                    //Choose between: 'mean', 'median', 'min', max', 'stdDev', 'count', 'percentile'
var percentile_value = [95];            //This variable will be activated when var metric = 'percentile'; Value must be between 0 and 100

var export_to_drive = 'Yes';             //'Yes' or 'No'
var epsg = 'EPSG:32632';                 // EPSG code in the selected region

var time_series_chart = 'Yes';              //'Yes' or 'No'; Calculating Time Series Charts by the given Parameters

//=============================================================================================
//This box is for calculating differenced indices
var Differenced = 'No';                //'Yes' or 'No'                                        
                                                                                            
var month_start_Postevent = 1;          //Startmonth of the temporal integration (Postevent)  
var month_end_Postevent = 12;           //Endyear of the temporal integration. (Postevent)

var year_start_Postevent = 2022;        //Startyear of the temporal integration. (Postevent)
var year_end_Postevent = 2022;          //Endyear of the temporal integration. (Postevent)

var Date_start_Postevent = '2022-02-01';  //'YYYY-MM-DD'
var Date_end_Postevent = '2022-02-28';    //'YYYY-MM-DD'
//======================================================================================

//Export single images to google drive
var export_singleimage = 'No';          // 'Yes' or 'No'
var imageID = 30;                        // Console: All images (with indices) --> Select one 
                                        //image and get the number
                                          
var region = 'Wuerzburg_Summer_2022';                  //ROI; Just for Exporting Data Name
var time_period = 'Landsat_9_SR';                              //Just for Exporting Data Name
//============================================================================================
// Print Satellite platform to console and define scale for each satellite
if (satellite == 'Sentinel') {
  var pl = 'Sentinel_2'; 
  var scale = 20;
} else if (satellite == 'Landsat') {
  var scale = 30;
  var pl = 'Landsat';
} else {
    if (index == 'LST') {
      var scale = 1000;
      var pl = 'Modis';}
    else if (index != 'LST') {
      var scale = 500;
      var pl = 'Modis';
    }
}
print(ee.String('Data selected for analysis: ').cat(pl));
print(ee.String('Index selected for analysis: ').cat(index));
print(ee.String('Metric selected for analysis: ').cat(metric));
//============================================================================================
//Zoom to roi and map it
Map.centerObject(geometry);
Map.addLayer(geometry, {color: 'red', strokeWidth: 5} , 'ROI');

//Change to geodesic rectangle
var rect_geodesic = ee.Geometry({geoJson: geometry, geodesic: true});
Map.addLayer(rect_geodesic, {color: "blue"}, "Geodesic rectangle");

//Get the area of the ROI
var stateArea = rect_geodesic.area();
var stateAreaSqKm = ee.Number(stateArea).divide(1e6).round();
print('Area of ROI (km2): ', stateAreaSqKm);

//============================================================================================
//                                  FUNCTIONS 
//
//                            SELECT AND RENAME BANDS
// Define functions to select and rename bands for Landsat-4/5/7
function renameBandsTM_ETM(image) {
    var bands = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7', 'QA_PIXEL'];
    var new_bands = ['B', 'G', 'R', 'NIR', 'SWIR1', 'SWIR2', 'pixel_qa'];
    return image.select(bands).rename(new_bands);
}


// Define functions to select and rename bands for Landsat-4/5/7 without pixel_qa
function renameBandsTM_ETM_without_pixel_qa(image) {
    var bands = ['B', 'G', 'R', 'NIR', 'SWIR1', 'SWIR2'];
    var new_bands = ['B', 'G', 'R', 'NIR', 'SWIR1', 'SWIR2'];
    return image.select(bands).rename(new_bands);
}

// Define functions to select and rename bands for Landsat-8 & 9
function renameBandsOLI(image) {
    var bands = ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7', 'QA_PIXEL'];
    var new_bands = ['B', 'G', 'R', 'NIR', 'SWIR1', 'SWIR2', 'pixel_qa'];
    return image.select(bands).rename(new_bands);
}

// Define function to multiply factor
function applyScaleFactors(image) {
  var opticalBands = image.select('B', 'G', 'R', 'NIR', 'SWIR1', 'SWIR2').multiply(0.0000275).add(-0.2);
  return image.addBands(opticalBands, null, true);
}

// Define functions to select and rename bands for Landsat-8 & 9 without pixel_qa
function renameBandsOLI_without_pixel_qa(image) {
    var bands = ['B', 'G', 'R', 'NIR', 'SWIR1', 'SWIR2'];
    var new_bands = ['B', 'G', 'R', 'NIR', 'SWIR1', 'SWIR2'];
    return image.select(bands).rename(new_bands);

}
//                        Sentinel-2
function renameBandsSentinel(image) {
    var bands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12', 'QA60'];
    var new_bands = ['B', 'G', 'R', 'Red Edge1', 'Red Edge2', 'Red Edge3', 'NIR', 'Red Edge 4', 'SWIR1', 'SWIR2', 'QA60'];
    return image.select(bands).rename(new_bands);
}

//                        Sentinel-2 without QA60
function renameBandsSentinel_without_QA60(image) {
    var bands = ['B', 'G', 'R', 'Red Edge1', 'Red Edge2', 'Red Edge3', 'NIR', 'Red Edge 4', 'SWIR1', 'SWIR2'];
    var new_bands = ['B', 'G', 'R', 'Red Edge1', 'Red Edge2', 'Red Edge3', 'NIR', 'Red Edge 4', 'SWIR1', 'SWIR2'];
    return image.select(bands).rename(new_bands);
}

//                        Modis
function renameBandsModis(image) {
    var bands = ['Nadir_Reflectance_Band3', 'Nadir_Reflectance_Band4', 'Nadir_Reflectance_Band1',
                 'Nadir_Reflectance_Band2', 'Nadir_Reflectance_Band5', 'Nadir_Reflectance_Band6',
                 'Nadir_Reflectance_Band7'];
    var new_bands = ['B', 'G', 'R', 'NIR', 'NIR2', 'SWIR1', 'SWIR2'];
    return image.select(bands).rename(new_bands);
}

//                        Modis - LST
function renameBandLST(image) {
    var bands = ['LST_Day_1km'];
    var new_bands = ['LST'];
    return image.select(bands).rename(new_bands);
}

//                           CLOUDMASKING
// Mask clouds, snow and cloud shadows based on the pixel_qa band (Landsat)
var cloudMaskLandsat = function (image) {
  // Get the pixel QA band.
  var qa = image.select('pixel_qa');
  // Bits 3 and 5 are cloud shadow and cloud, respectively.
  // Use LeftShift-Operators to define Bit values
  var CloudShadowBitValue = 8; //(1 << 3);
  var CloudBitValue = 32; //(1 << 5);
  // Create masks
  var shadow_mask = qa.bitwiseAnd(CloudShadowBitValue).eq(0);
  var cloud_mask = qa.bitwiseAnd(CloudBitValue).eq(0);
  // Given bit values should be set to zero for masking.
  var final_mask = shadow_mask.and(cloud_mask);
  return image.updateMask(final_mask);
};

// Mask clouds, snow and cloud shadows based on the pixel_qa band (Landsat)
var cloudMaskLandsat9 = function (image) {
  // Get the pixel QA band.
  var qa = image.select('pixel_qa');
  // Bits 3 and 5 are cloud shadow and cloud, respectively.
  // Use LeftShift-Operators to define Bit values
  var CloudShadowBitValue = 1 << 3; //(1 << 3);
  var CloudBitValue = 1 << 4; //(1 << 5);
  // Create masks
  var shadow_mask = qa.bitwiseAnd(CloudShadowBitValue).eq(0);
  var cloud_mask = qa.bitwiseAnd(CloudBitValue).eq(0);
  // Given bit values should be set to zero for masking.
  var final_mask = shadow_mask.and(cloud_mask);
  return image.updateMask(final_mask);
};

//Mask clouds and cirrus based on the QA60 band (Sentinel2)
//Function for CloudMasking
var cloudMaskSentinel2 = function (image) {
  // Get the QA band
  var qa = image.select('QA60');
  // Bits 10 and 11 are clouds and cirrus, respectively.
  var clouds = qa.bitwiseAnd(Math.pow(2, 10)).eq(0);
  var cirrus = qa.bitwiseAnd(Math.pow(2, 11)).eq(0);
  // mask clouds and cirrus
  return image.updateMask(clouds).updateMask(cirrus);
};

//                  INDICES
// Create function for NDVI
function my_ndvi(image) {
  var ndvi_var = image.expression(
    "(NIR - RED)/(NIR + RED)",
    {
    NIR: image.select("NIR"),
    RED: image.select("R"),
    });
  return image
    .addBands(ndvi_var
    .rename('NDVI'))
    .float();
}

// Create function for NDWI
function my_ndwi(image) {
  var ndwi_var = image.expression(
    "(NIR - SWIR1)/(NIR + SWIR1)",
    {
    NIR: image.select("NIR"),
    SWIR1: image.select("SWIR1"),
    });
  return image
    .addBands(ndwi_var
    .rename('NDWI'))
    .float();
}

// Create function for NBR
function my_nbr(image) {
  var nbr_var = image.expression(
    "(NIR - SWIR2)/(NIR + SWIR2)",
    {
    NIR: image.select("NIR"),
    SWIR2: image.select("SWIR2"),
    });
  return image
    .addBands(nbr_var
    .rename('NBR'))
    .float();
}

// Create function for NDSI
function my_ndsi(image) {
  var ndsi_var = image.expression(
    "(Green - SWIR1)/(Green + SWIR1)",
    {
    Green: image.select("G"),
    SWIR1: image.select("SWIR1"),
    });
  return image
    .addBands(ndsi_var
    .rename('NDSI'))
    .float();
}

// Create function for Modis-NDWI (Gao 1996)
function my_ndwi_modis(image) {
  var ndwi_var = image.expression(
    "(NIR - NIR2)/(NIR + NIR2)",
    {
    NIR: image.select("NIR"),
    NIR2: image.select("NIR2"),
    });
  return image
    .addBands(ndwi_var
    .rename('NDWI_Modis'))
    .float();
}

// Create function for Modis-LST to Float
function lst_float(image) {
  return image.float();
}
//=======================================PARAMS==============================================
var ndviParams = {min: 0.0, max: 1.0, palette: [
    'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718', '74A901', '66A000', '529400',
    '3E8601', '207401', '056201', '004C00', '023B01', '012E01', '011D01', '011301']};
var lstParams = {min: 13000.0, max: 16500.0, palette: ['040274', '040281', '0502a3', '0502b8',
'0502ce', '0502e6', '0602ff', '235cb1', '307ef3', '269db1', '30c8e2', '32d3ef','3be285', '3ff38f',
'86e26f', '3ae237', 'b5e22e', 'd6e21f', 'fff705', 'ffd611', 'ffb613', 'ff8b13', 'ff6e08', 'ff500d',
'ff0000', 'de0101', 'c21301', 'a71001', '911003']};
var nbrParams = {min: -1, max: 1, palette: ['green', 'white', 'red']};
var dndviParams = {min: -2, max: 2, palette: ['green', 'white', 'red']};
var dnbrParams = {min: -2, max: 2, palette: ['green', 'white', 'red']};
var dndwiParams = {min: -2, max: 2, palette: ['green', 'white', 'red']};
var dndsiParams = {min: -2, max: 2, palette: ['green', 'white', 'red']};
var ndwiParams = {min: -1.0, max: 1.0, palette: ['0000ff', '00ffff', 'ffff00', 'ff0000', 'ffffff']};
var ndsiParams = {min: -1.0, max: 1.0, palette: ['000088', '0000FF', '8888FF', 'FFFFFF']};
var Landsat_median_RGB_Params = {bands: ['R', 'G', 'B'], min: 0.0, max: 0.3, gamma: 1.5};   
var Sentinel_median_RGB_Params = {bands: ['R', 'G', 'B'], min:0.0, max:2000.0, gamma: 1.5};
var Modis_median_RGB_Params = {bands: ['R', 'G', 'B'], min: 0.0, max: 4000.0, gamma: 1.4,};
//===========================================================================================
//                                      METRICS
if (metric == 'median') {
  var Metric = ee.Reducer.median();
}
else if (metric == 'mean') {
  var Metric = ee.Reducer.mean();
}
else if (metric == 'min') {
  var Metric = ee.Reducer.min();
}
else if (metric == 'max') {
  var Metric = ee.Reducer.max();
}
else if (metric == 'stdDev') {
  var Metric = ee.Reducer.stdDev();
}
else if (metric == 'count') {
  var Metric = ee.Reducer.count();
}  
else if (metric == 'percentile') {
  var Metric = ee.Reducer.percentile(percentile_value);
}

//============================================================================================
// Define Landsat-4 Image Collection
if (satellite == 'Landsat') {
  var L4_col = ee.ImageCollection('LANDSAT/LT04/C02/T1_L2')
  .filterBounds(geometry)
  .filter(ee.Filter.lt('CLOUD_COVER_LAND', max_cloud_cover))
  .map(renameBandsTM_ETM)
  .map(cloudMaskLandsat)
  .map(renameBandsTM_ETM_without_pixel_qa)
  .map(applyScaleFactors)
  .filter(ee.Filter.calendarRange(year_start, year_end, 'year')) 
  .filter(ee.Filter.calendarRange(month_start, month_end, 'month'))
  .filterDate(Date_start, Date_end)
  .map(function(image){return image.clip(geometry)});


// Define Landsat-5 Image Collection
  var L5_col = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
  .filterBounds(geometry)
  .filter(ee.Filter.lt('CLOUD_COVER_LAND', max_cloud_cover))
  .map(renameBandsTM_ETM)
  .map(cloudMaskLandsat)
  .map(renameBandsTM_ETM_without_pixel_qa)
  .map(applyScaleFactors)
  .filter(ee.Filter.calendarRange(year_start, year_end, 'year')) 
  .filter(ee.Filter.calendarRange(month_start, month_end, 'month'))
  .filterDate(Date_start, Date_end)
  .map(function(image){return image.clip(geometry)});

// Define Landsat-7 Image Collection
  var L7_col = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
  .filterBounds(geometry)
  .filter(ee.Filter.lt('CLOUD_COVER_LAND', max_cloud_cover))
  .map(renameBandsTM_ETM)
  .map(cloudMaskLandsat)
  .map(renameBandsTM_ETM_without_pixel_qa)
  .map(applyScaleFactors)
  .filter(ee.Filter.calendarRange(year_start, year_end, 'year')) 
  .filter(ee.Filter.calendarRange(month_start, month_end, 'month'))
  .filterDate(Date_start, Date_end)
  .map(function(image){return image.clip(geometry)});
  
// Load an Landsat-8 ImageCollection.
  var L8_col = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(geometry)
  .filter(ee.Filter.lt('CLOUD_COVER_LAND', max_cloud_cover)) 
  .map(renameBandsOLI)
  .map(cloudMaskLandsat)
  .map(renameBandsOLI_without_pixel_qa)
  .map(applyScaleFactors)
  .filter(ee.Filter.calendarRange(year_start, year_end, 'year')) 
  .filter(ee.Filter.calendarRange(month_start, month_end, 'month'))
  .filterDate(Date_start, Date_end)
  .map(function(image){return image.clip(geometry)});
  
// Load an Landsat-9 ImageCollection.
  var L9_col = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .filterBounds(geometry)
  .filter(ee.Filter.lt('CLOUD_COVER_LAND', max_cloud_cover)) 
  .map(renameBandsOLI)
  .map(cloudMaskLandsat9)
  .map(renameBandsOLI_without_pixel_qa)
  .map(applyScaleFactors)
  .filter(ee.Filter.calendarRange(year_start, year_end, 'year')) 
  .filter(ee.Filter.calendarRange(month_start, month_end, 'month'))
  .filterDate(Date_start, Date_end)
  .map(function(image){return image.clip(geometry)});

// Merge all collections
  var Merge_col_Landsat = L4_col.merge(L5_col).merge(L7_col).merge(L8_col).merge(L9_col);
// Sort by date
  var Merge_col_Landsat = Merge_col_Landsat.sort("system:time_start");
  print('All Images', Merge_col_Landsat);
// Add indices to ImageCollection
  var temp = Merge_col_Landsat.map(my_ndvi)
                                .map(my_ndwi)
                                  .map(my_nbr)
                                    .map(my_ndsi);
  print('All Images (with all indices)', temp);
  
//============================================================================================
//=====IF DIFFERENCED INDICES=================================================================

  if (Differenced == 'Yes') {
    print('For differenced Indices (below):');
    // Define Landsat-4 Image Collection POSTEVENT
    var L4_col_POSTEVENT = ee.ImageCollection('LANDSAT/LT04/C02/T1_L2')
    .filterBounds(geometry)
    .filter(ee.Filter.lt('CLOUD_COVER_LAND', max_cloud_cover))
    .map(renameBandsTM_ETM)
    .map(cloudMaskLandsat)
    .map(renameBandsTM_ETM_without_pixel_qa)
    .map(applyScaleFactors)
    .filter(ee.Filter.calendarRange(year_start_Postevent, year_end_Postevent, 'year')) 
    .filter(ee.Filter.calendarRange(month_start_Postevent, month_end_Postevent, 'month'))
    .filterDate(Date_start_Postevent, Date_end_Postevent)
    .map(function(image){return image.clip(geometry)});

    // Define Landsat-5 Image Collection POSTEVENT
    var L5_col_POSTEVENT = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
    .filterBounds(geometry)
    .filter(ee.Filter.lt('CLOUD_COVER_LAND', max_cloud_cover))
    .map(renameBandsTM_ETM)
    .map(cloudMaskLandsat)
    .map(renameBandsTM_ETM_without_pixel_qa)
    .map(applyScaleFactors)
    .filter(ee.Filter.calendarRange(year_start_Postevent, year_end_Postevent, 'year')) 
    .filter(ee.Filter.calendarRange(month_start_Postevent, month_end_Postevent, 'month'))
    .filterDate(Date_start_Postevent, Date_end_Postevent)
    .map(function(image){return image.clip(geometry)});

    // Define Landsat-7 Image Collection POSTEVENT
    var L7_col_POSTEVENT = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
    .filterBounds(geometry)
    .filter(ee.Filter.lt('CLOUD_COVER_LAND', max_cloud_cover))
    .map(renameBandsTM_ETM)
    .map(cloudMaskLandsat)
    .map(renameBandsTM_ETM_without_pixel_qa)
    .map(applyScaleFactors)
    .filter(ee.Filter.calendarRange(year_start_Postevent, year_end_Postevent, 'year')) 
    .filter(ee.Filter.calendarRange(month_start_Postevent, month_end_Postevent, 'month'))
    .filterDate(Date_start_Postevent, Date_end_Postevent)
    .map(function(image){return image.clip(geometry)});
    
    // Load an Landsat-8 ImageCollection POSTEVENT
    var L8_col_POSTEVENT = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterBounds(geometry)
    .filter(ee.Filter.lt('CLOUD_COVER_LAND', max_cloud_cover))
    .map(renameBandsOLI)
    .map(cloudMaskLandsat)
    .map(renameBandsOLI_without_pixel_qa)
    .map(applyScaleFactors)
    .filter(ee.Filter.calendarRange(year_start_Postevent, year_end_Postevent, 'year')) 
    .filter(ee.Filter.calendarRange(month_start_Postevent, month_end_Postevent, 'month'))
    .filterDate(Date_start_Postevent, Date_end_Postevent)
    .map(function(image){return image.clip(geometry)});
    
    // Load an Landsat-9 ImageCollection.
    var L9_col_POSTEVENT = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
    .filterBounds(geometry)
    .filter(ee.Filter.lt('CLOUD_COVER_LAND', max_cloud_cover)) 
    .map(renameBandsOLI)
    .map(cloudMaskLandsat9)
    .map(renameBandsOLI_without_pixel_qa)
    .map(applyScaleFactors)
    .filter(ee.Filter.calendarRange(year_start_Postevent, year_end_Postevent, 'year')) 
    .filter(ee.Filter.calendarRange(month_start_Postevent, month_end_Postevent, 'month'))
    .filterDate(Date_start_Postevent, Date_end_Postevent)
    .map(function(image){return image.clip(geometry)});
  
    // Merge collections
    var Merge_col_Landsat_Postevent = L4_col_POSTEVENT.merge(L5_col_POSTEVENT).merge(L7_col_POSTEVENT).merge(L8_col_POSTEVENT).merge(L9_col_POSTEVENT);
    // Sort by date
    var Merge_col_Landsat_Postevent = Merge_col_Landsat_Postevent.sort("system:time_start");
    print('All Images Postevent', Merge_col_Landsat_Postevent);
  
       // Add indices to ImageCollection
    var temp_POSTEVENT = Merge_col_Landsat_Postevent.map(my_ndvi)
                                                      .map(my_ndwi)
                                                        .map(my_nbr)
                                                          .map(my_ndsi);
    print('All Images Postevent (with all indices)', temp_POSTEVENT);
    
//===============================================================================================
    //Calculating differenced Indices
        
    //Reduce the two collections with the selected metric
    var temp_PREEVENT = temp.reduce(Metric);
    var temp_POSTEVENT_FOR_DIFFERENCED = temp_POSTEVENT.reduce(Metric);
    var temp_differenced = temp_PREEVENT.subtract(temp_POSTEVENT_FOR_DIFFERENCED);
    print('Difference Image:', temp_differenced);
    var temp_differenced = temp_differenced.rename(['B', 'G', 'R', 'NIR', 'SWIR1', 'SWIR2',
                      'NDVI', 'NDWI', 'NBR', 'NDSI'])
}
//=================================================================================
//==================================Sentinel-2=====================================
}  
else if (satellite == 'Sentinel') {
    // Load an Sentinel-2 ImageCollection.
    var S2_col = ee.ImageCollection('COPERNICUS/S2_SR')
      .filterBounds(geometry)
      .filter(ee.Filter.lt('CLOUD_COVERAGE_ASSESSMENT', max_cloud_cover))
      .map(renameBandsSentinel)
      .map(cloudMaskSentinel2)
      .map(renameBandsSentinel_without_QA60)
      .filter(ee.Filter.calendarRange(year_start, year_end, 'year')) 
      .filter(ee.Filter.calendarRange(month_start, month_end, 'month'))
      .filterDate(Date_start, Date_end)
      .map(function(image){return image.clip(geometry)});
    
    print('All Images', S2_col);  
    // Sort by date
    var Merge_col_Sentinel = S2_col.sort("system:time_start");
    var temp = Merge_col_Sentinel.map(my_ndvi)
                                    .map(my_ndwi)
                                      .map(my_nbr)
                                        .map(my_ndsi);
    print('All Images (with all indices)', temp);
    
      if (Differenced == 'Yes') {
      print('For differenced Indices (below)');
      // Load an Sentinel-2 ImageCollection.
      var S2_col_POSTEVENT = ee.ImageCollection('COPERNICUS/S2_SR')
        .filterBounds(geometry)
        .filter(ee.Filter.lt('CLOUD_COVERAGE_ASSESSMENT', max_cloud_cover))
        .map(renameBandsSentinel)
        .map(cloudMaskSentinel2)
        .map(renameBandsSentinel_without_QA60)
        .filter(ee.Filter.calendarRange(year_start_Postevent, year_end_Postevent, 'year')) 
        .filter(ee.Filter.calendarRange(month_start_Postevent, month_end_Postevent, 'month'))
        .filterDate(Date_start_Postevent, Date_end_Postevent)
        .map(function(image){return image.clip(geometry)});
      print('All Images Postevent', S2_col_POSTEVENT);  
      // Sort by date
      var temp_POSTEVENT = S2_col_POSTEVENT.sort("system:time_start");
      var temp_POSTEVENT = temp_POSTEVENT.map(my_ndvi)
                                          .map(my_ndwi)
                                            .map(my_nbr)
                                              .map(my_ndsi);
      print('All Images Postevent (with all indices)', temp_POSTEVENT);
//===============================================================================================
      //Calculating differenced Indices
      //Reduce the two collections with the selected metric
      
      var temp_PREEVENT = temp.reduce(Metric);
      var temp_POSTEVENT_FOR_DIFFERENCED = temp_POSTEVENT.reduce(Metric);
      var temp_differenced = temp_PREEVENT.subtract(temp_POSTEVENT_FOR_DIFFERENCED);
      print('Difference Image:', temp_differenced);
      var temp_differenced = temp_differenced.rename(['B', 'G', 'R', 'Red Edge1', 'Red Edge2', 
                      'Red Edge3',  'NIR', 'Red Edge 4', 'SWIR1', 'SWIR2',
                      'NDVI', 'NDWI', 'NBR', 'NDSI'])
      }}
else if (satellite == 'Modis')  {
  //Load an Modis ImageCollection
  var dataset = ee.ImageCollection('MODIS/006/MCD43A4')
                  .filterBounds(geometry)
                  .filter(ee.Filter.calendarRange(year_start, year_end, 'year')) 
                  .filter(ee.Filter.calendarRange(month_start, month_end, 'month'))
                  .filter(ee.Filter.date(Date_start, Date_end))
                  .map(renameBandsModis)
                  .map(function(image){return image.clip(geometry)});
  print('All Images', dataset);  
  temp = dataset.map(my_ndvi)
                  .map(my_ndwi_modis)
                    .map(my_nbr)
                      .map(my_ndsi);
    
  //Load an Modis-LST ImageCollection
  var dataset_lst = ee.ImageCollection('MODIS/006/MOD11A1')
                  .filterBounds(geometry)
                  .filter(ee.Filter.calendarRange(year_start, year_end, 'year')) 
                  .filter(ee.Filter.calendarRange(month_start, month_end, 'month'))
                  .filter(ee.Filter.date(Date_start, Date_end))
                  .map(renameBandLST)
                  .map(lst_float)
                  .map(function(image){return image.clip(geometry)});
  var temp_lst = dataset_lst.select('LST');
  //Combine the two Collections
  var temp = temp.combine(temp_lst);
  print('All Images (with all indices)', temp);
//=============================================================================================== 
  if (Differenced == 'Yes') {
    //Load an Modis ImageCollection
    print('For differenced Indices (below)');
    var dataset_POSTEVENT = ee.ImageCollection('MODIS/006/MCD43A4')
                  .filterBounds(geometry)
                  .filter(ee.Filter.calendarRange(year_start_Postevent, year_end_Postevent, 'year')) 
                  .filter(ee.Filter.calendarRange(month_start_Postevent, month_end_Postevent, 'month'))
                  .filter(ee.Filter.date(Date_start_Postevent, Date_end_Postevent))
                  .map(renameBandsModis)
                  .map(function(image){return image.clip(geometry)});
    print('All Images', dataset_POSTEVENT);  
    temp_POSTEVENT = dataset_POSTEVENT.map(my_ndvi)
                                        .map(my_ndwi_modis)
                                          .map(my_nbr)
                                            .map(my_ndsi);
    
    //Load an Modis-LST ImageCollection
    var dataset_lst_POSTEVENT = ee.ImageCollection('MODIS/006/MOD11A1')
                  .filterBounds(geometry)
                  .filter(ee.Filter.calendarRange(year_start_Postevent, year_end_Postevent, 'year')) 
                  .filter(ee.Filter.calendarRange(month_start_Postevent, month_end_Postevent, 'month'))
                  .filter(ee.Filter.date(Date_start_Postevent, Date_end_Postevent))
                  .map(renameBandLST)
                  .map(lst_float)
                  .map(function(image){return image.clip(geometry)});
    var temp_lst_POSTEVENT = dataset_lst_POSTEVENT.select('LST');
    //Combine the two Collections
    var temp_POSTEVENT = temp_POSTEVENT.combine(temp_lst_POSTEVENT);
    print('All Images (with all indices)', temp_POSTEVENT);
//===============================================================================================
    //Calculating differenced Indices
    //Reduce the two collections with the selected metric
    var temp_PREEVENT = temp.reduce(Metric);
    var temp_POSTEVENT_FOR_DIFFERENCED = temp_POSTEVENT.reduce(Metric);
    var temp_differenced = temp_PREEVENT.subtract(temp_POSTEVENT_FOR_DIFFERENCED);
    print('Difference Image:', temp_differenced);
    var temp_differenced = temp_differenced.rename(['B', 'G', 'R', 'NIR', 'NIR2', 
                      'SWIR1', 'SWIR2', 'NDVI', 'NDWI_Modis', 'NBR', 'NDSI', 'LST'])
  }}


if (time_series_chart == 'Yes'){
  if (metric != 'percentile'){
    var title = satellite + ' ' + index + ' (' + metric + ')'
  }
  else if (metric == 'percentile'){
    var title = satellite + ' ' + index + ' (' + metric + '_' + percentile_value + ')'
  }

    if (time_series_chart == 'Yes'){
      var my_chart = ui.Chart.image.series({imageCollection: temp.select(index),
      region: geometry,
      reducer: Metric,
      scale: scale,
      }).setOptions({
      title: title,
      vAxis: {title: index},
      hAxis: {title: 'Date'}
      });
      print(my_chart);
}
  if (metric != 'percentile' && Differenced == 'Yes'){
    var title = satellite + ' ' + index + ' (' + metric + ')' + ' Postevent'
  }
  else if (metric == 'percentile' && Differenced == 'Yes'){
    var title = satellite + ' ' + index + ' (' + metric + '_' + percentile_value + ')' + ' Postevent'
  }
  
  if (Differenced == 'Yes'){
    var my_chart = ui.Chart.image.series({imageCollection: temp_POSTEVENT.select(index),
    region: geometry,
    reducer: Metric,
    scale: scale,
  }).setOptions({
    title: title,
    vAxis: {title: index},
    hAxis: {title: 'Date'}
    });
    print(my_chart);
  
}
}
//=============================================================================================
//                            EXPORTING DATA 


if (metric == 'percentile' && Differenced != 'Yes') {
  var description = pl + '_All_bands_and_indices_'+ metric + '_' + percentile_value + '_' + Date_start + '_' + Date_end + '_'
  + region + '_' + time_period
  }
else if (metric != 'percentile' && Differenced != 'Yes'){
    var description = pl + '_All_bands_and_indices_'+ metric + '_' + Date_start + '_' + Date_end + '_'
  + region + '_' + time_period
}
  
//Exporting the selected index with the selected metric
if (export_to_drive == 'Yes' && Differenced != 'Yes') {
  Export.image.toDrive({
  image: temp.reduce(Metric),
  description: description,
  folder: 'GEE_Export',
  scale: scale,
  crs: epsg,
  region: rect_geodesic
})

  //RGB Median Image for Landsat & Sentinel
  if (satellite == 'Sentinel') {
    //Sentiel-2 RGB Bands = 10m Spatial Resolution
    var scale = 10;
    }
  var rgb_image = temp.median().select(['R', 'G', 'B']);
  Export.image.toDrive({
  image: rgb_image,
  description: pl + '_' + 'RGB_median_' + Date_start + '_' + Date_end + 
  '_' + region + '_' + time_period,
  folder: 'GEE_Export',
  scale: scale,
  crs: epsg,
  region: rect_geodesic
})}


//                        EXPORTING DIFFERENCED INDEX

if (metric == 'percentile' && Differenced == 'Yes') {
  var description = pl + '_differenced_' + index + '_' + metric + '_' + percentile_value + '_' + Date_start 
  + '_' + Date_end + '-' + Date_start_Postevent + '_' + Date_end_Postevent  + '_' + region + '_' + time_period
  }
else if (metric != 'percentile' && Differenced == 'Yes'){
    var description = pl + '_differenced_' + index + '_' + metric + '_' + Date_start + '_' + Date_end + '-'
  + Date_start_Postevent + '_' + Date_end_Postevent  + '_' + region + '_' + time_period
}

if (export_to_drive == 'Yes' && Differenced == 'Yes') {
  Export.image.toDrive({
  image: temp_differenced,
  description: description,
  folder: 'GEE_Export',
  scale: scale,
  crs: epsg,
  region: rect_geodesic
})}

//                          EXPORTING SINGLE IMAGES
// Landsat single Image Export
if (satellite == 'Landsat' && export_singleimage == 'Yes' && Differenced != 'Yes') {
  var listOfImages = temp.toList(temp.size());
  var singleimage = ee.Image(listOfImages.get(imageID));
  var singleimage = singleimage.select(['B', 'G', 'R', 'NIR', 'SWIR1', 'SWIR2', 
                                   'NDVI', 'NDWI', 'NBR', 'NDSI']);
                                   
  var date = singleimage.date().format().getInfo();
  var date = date.replace(':', '-');
  var date = date.replace(':', '-');
  var landsat_satellite = singleimage.get('SATELLITE').getInfo().toLowerCase().slice(1);
  
  Export.image.toDrive({
  image: singleimage,
  description: 'L' + landsat_satellite + '_Single_Image_from_' + date  + '_' + region,
  folder: 'GEE_Export',
  scale: scale,
  crs: epsg,
  region: rect_geodesic
})}
// Sentinel single Image Export
if (satellite == 'Sentinel' && export_singleimage == 'Yes' && Differenced != 'Yes') {
  var listOfImages = temp.toList(temp.size());
  var singleimage = ee.Image(listOfImages.get(imageID));
  var singleimage = singleimage.select(['B', 'G', 'R', 'Red Edge1', 'Red Edge2', 
                      'Red Edge3',  'NIR', 'Red Edge 4', 'SWIR1', 'SWIR2',
                      'NDVI', 'NDWI', 'NBR', 'NDSI']);
                                   
  var date = singleimage.date().format().getInfo();
  var date = date.replace(':', '-');
  var date = date.replace(':', '-');

  Export.image.toDrive({
  image: singleimage,
  description: 'Sentinel_2_Single_Image_from_' + date + '_' + region,
  folder: 'GEE_Export',
  scale: scale,
  crs: epsg,
  region: rect_geodesic
})}
// Modis single Image Export
if (satellite == 'Modis' && export_singleimage == 'Yes' && Differenced != 'Yes') {
  var listOfImages = temp.toList(temp.size());
  var singleimage = ee.Image(listOfImages.get(imageID));
  var singleimage = singleimage.select(['B', 'G', 'R', 'NIR', 'NIR2', 
                      'SWIR1', 'SWIR2', 'NDVI', 'NDWI_Modis', 'NBR', 'NDSI', 'LST']);
                                   
  var date = singleimage.get('system:index').getInfo();

  Export.image.toDrive({
  image: singleimage,
  description: 'Modis_Single_Image_from_' + date + '_' + region,
  folder: 'GEE_Export',
  scale: scale,
  crs: epsg,
  region: rect_geodesic
})}

//=============================================================================================
//                            DISPLAYING DATA IN GEE

if (satellite == 'Landsat'){
  if (index == 'NDVI') {
  Map.addLayer(temp.median(), Landsat_median_RGB_Params, 'RGB Median (Landsat) ');
  Map.addLayer(temp.select(index).reduce(Metric), ndviParams, 'NDVI (with selected metric) Image (Landsat)');
    if (Differenced == 'Yes') {
     Map.addLayer(temp_POSTEVENT.median(), Landsat_median_RGB_Params, 'RGB Median Postevent (Landsat)');
     Map.addLayer(temp_POSTEVENT.select(index).reduce(Metric), ndviParams, 'NDVI (with selected metric) Image Postevent (Landsat)');
     Map.addLayer(temp_differenced.select(index), dndviParams, 'differenced NDVI (with selected metric)');
    }} 

  else if (index == 'NBR') {
    Map.addLayer(temp.median(), Landsat_median_RGB_Params, 'RGB Median (Landsat) ');
    Map.addLayer(temp.select(index).reduce(Metric), nbrParams, 'NBR (with selected metric) Image (Landsat)');
    if (Differenced == 'Yes'){
      Map.addLayer(temp_POSTEVENT.median(), Landsat_median_RGB_Params, 'RGB Median Postevent (Landsat)');
      Map.addLayer(temp_POSTEVENT.select(index).reduce(Metric), nbrParams, 'NBR (with selected metric) Image Postevent (Landsat)');
      Map.addLayer(temp_differenced.select(index), dnbrParams, 'differenced NBR (with selected metric)');
    }} 

  else if (index == 'NDWI') {
    Map.addLayer(temp.median(), Landsat_median_RGB_Params, 'RGB Median (Landsat) ');
    Map.addLayer(temp.select(index).reduce(Metric), ndwiParams, 'NDWI (with selected metric) Image (Landsat)');
    if (Differenced == 'Yes'){
      Map.addLayer(temp_POSTEVENT.median(), Landsat_median_RGB_Params, 'RGB Median Postevent (Landsat)');
      Map.addLayer(temp_POSTEVENT.select(index).reduce(Metric), ndwiParams, 'NDWI (with selected metric) Image Postevent (Landsat)');
      Map.addLayer(temp_differenced.select(index), dndwiParams, 'differenced NDWI (with selected metric)');
    }} 

  else if (index == 'NDSI') {
    Map.addLayer(temp.median(), Landsat_median_RGB_Params, 'RGB Median (Landsat) ');
    Map.addLayer(temp.select(index).reduce(Metric), ndsiParams, 'NDSI (with selected metric) Image (Landsat)');
    if (Differenced == 'Yes'){
      Map.addLayer(temp_POSTEVENT.median(), Landsat_median_RGB_Params, 'RGB Median Postevent (Landsat)');
      Map.addLayer(temp_POSTEVENT.select(index).reduce(Metric), ndsiParams, 'NDSI (with selected metric) Image Postevent (Landsat)');
      Map.addLayer(temp_differenced.select(index), dndsiParams, 'differenced NDSI (with selected metric)');
    }}
}

else if (satellite == 'Sentinel'){
  
  if (index == 'NDVI') {
    Map.addLayer(temp.median(), Sentinel_median_RGB_Params, 'RGB Median (Sentinel-2)');
    Map.addLayer(temp.select(index).reduce(Metric), ndviParams, 'NDVI (with selected metric) (Image Sentinel-2)');
    if (Differenced == 'Yes'){
      Map.addLayer(temp_POSTEVENT.median(), Sentinel_median_RGB_Params, 'RGB Median Postevent (Sentinel-2)');
      Map.addLayer(temp_POSTEVENT.select(index).reduce(Metric), ndviParams, 'NDVI (with selected metric) Image Postevent (Sentinel-2)');
      Map.addLayer(temp_differenced.select(index), dndviParams, 'differenced NDVI (with selected metric)');
  }} 

  else if (index == 'NBR') {
    Map.addLayer(temp.median(), Sentinel_median_RGB_Params, 'RGB Median (Sentinel-2)');
    Map.addLayer(temp.select(index).reduce(Metric), nbrParams, 'NBR (with selected metric) Image (Sentinel-2)');
    if (Differenced == 'Yes'){
      Map.addLayer(temp_POSTEVENT.median(), Sentinel_median_RGB_Params, 'RGB Median Postevent (Sentinel-2)');
      Map.addLayer(temp_POSTEVENT.select(index).reduce(Metric), nbrParams, 'NBR (with selected metric) Image Postevent (Sentinel-2)');
      Map.addLayer(temp_differenced.select(index), dnbrParams, 'differenced NBR (with selected metric)');
    }} 

  else if (index == 'NDWI') {
    Map.addLayer(temp.median(), Sentinel_median_RGB_Params, 'RGB Median (Sentinel-2)');
    Map.addLayer(temp.select(index).reduce(Metric), ndwiParams, 'NDWI (with selected metric) Image (Sentinel-2)');
    if (Differenced == 'Yes'){
      Map.addLayer(temp_POSTEVENT.median(), Sentinel_median_RGB_Params, 'RGB Median Postevent (Sentinel-2)');
      Map.addLayer(temp_POSTEVENT.select(index).reduce(Metric), ndwiParams, 'NDWI (with selected metric) Image Postevent (Sentinel-2)');
      Map.addLayer(temp_differenced.select(index), dndwiParams, 'differenced NDWI (with selected metric)');    
    }} 

  else if (index == 'NDSI') {
    Map.addLayer(temp.median(), Sentinel_median_RGB_Params, 'RGB Median (Sentinel-2)');
    Map.addLayer(temp.select(index).reduce(Metric), ndsiParams, 'NDSI (with selected metric) Image (Sentinel-2)');
    if (Differenced == 'Yes'){
      Map.addLayer(temp_POSTEVENT.median(), Sentinel_median_RGB_Params, 'RGB Median Postevent (Sentinel-2)');
      Map.addLayer(temp_POSTEVENT.select(index).reduce(Metric), ndsiParams, 'NDSI (with selected metric) Image Postevent (Sentinel-2)');
      Map.addLayer(temp_differenced.select(index), dndsiParams, 'differenced NDSI (with selected metric)'); 
    }}

}

else if (satellite == 'Modis'){

  if (index == 'NDVI') {
    Map.addLayer(temp.median(), Landsat_median_RGB_Params, 'RGB Median (Modis)');
    Map.addLayer(temp.select(index).reduce(Metric), ndviParams, 'NDVI (with selected metric) Image (Modis)');
    if (Differenced == 'Yes'){
      Map.addLayer(temp_POSTEVENT.median(), Modis_median_RGB_Params, 'RGB Median Postevent (Modis)');
      Map.addLayer(temp_POSTEVENT.select(index).reduce(Metric), ndviParams, 'NDVI (with selected metric) Image Postevent (Modis)');
      Map.addLayer(temp_differenced.select(index), dndviParams, 'differenced NDVI (with selected metric)');
    }} 

  else if (index == 'NBR') {
    Map.addLayer(temp.median(), Landsat_median_RGB_Params, 'RGB Median (Modis)');
    Map.addLayer(temp.select(index).reduce(Metric), ndwiParams, 'NBR (with selected metric) Image (Modis)');
    if (Differenced == 'Yes'){
      Map.addLayer(temp_POSTEVENT.median(), Modis_median_RGB_Params, 'RGB Median Postevent (Modis)');
      Map.addLayer(temp_POSTEVENT.select(index).reduce(Metric), nbrParams, 'NBR (with selected metric) Image Postevent (Modis)');
      Map.addLayer(temp_differenced.select(index), dnbrParams, 'differenced NBR (with selected metric)');
    }}

  else if (index == 'NDWI') {
    Map.addLayer(temp.median(), Landsat_median_RGB_Params, 'RGB Median (Modis)');
    Map.addLayer(temp.select('NDWI_Modis').reduce(Metric), nbrParams, 'NDWI (with selected metric) Image (Modis)');
    if (Differenced == 'Yes'){
      Map.addLayer(temp_POSTEVENT.median(), Modis_median_RGB_Params, 'RGB Median Postevent (Modis)');
      Map.addLayer(temp_POSTEVENT.select('NDWI_Modis').reduce(Metric), ndwiParams, 'NDWI (with selected metric) Image Postevent (Modis)');
      Map.addLayer(temp_differenced.select('NDWI_Modis'), dndwiParams, 'differenced NDWI (with selected metric)');
    }}

  else if (index == 'NDSI') {
    Map.addLayer(temp.median(), Landsat_median_RGB_Params, 'RGB Median (Modis)');
    Map.addLayer(temp.select(index).reduce(Metric), ndsiParams, 'NDSI (with selected metric) Image (Modis)');
    if (Differenced == 'Yes'){
      Map.addLayer(temp_POSTEVENT.median(), Modis_median_RGB_Params, 'RGB Median Postevent (Modis)');
      Map.addLayer(temp_POSTEVENT.select(index).reduce(Metric), ndsiParams, 'NDSI (with selected metric) Image Postevent (Modis)');
      Map.addLayer(temp_differenced.select(index), dndsiParams, 'differenced NDSI (with selected metric)');
    }}

  else if (index == 'LST') {
    Map.addLayer(temp.median(), Landsat_median_RGB_Params, 'RGB Median (Modis)');
    Map.addLayer(temp.select(index).reduce(Metric), lstParams, 'LST (with selected metric) Image (Modis)');
    if(Differenced == 'Yes'){
      Map.addLayer(temp_POSTEVENT.median(), Modis_median_RGB_Params, 'RGB Median Postevent (Modis)');
      Map.addLayer(temp_POSTEVENT.select(index).reduce(Metric), lstParams, 'LST (with selected metric) Image Postevent (Modis)');
      Map.addLayer(temp_differenced.select(index), lstParams, 'differenced LST (with selected metric)');
    }}

}
//END