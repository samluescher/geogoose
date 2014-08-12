var geogoose = require('../'),
	coordinates = geogoose.coordinates,
	mongoose = require('mongoose'),
	assert = require("assert");

describe('GeoFeature', function() {

	before(function() {
		assert(process.env.DB_URI, 'please make sure process.env.DB_URI is defined');
		mongoose.connect(process.env.DB_URI);
	});

	var GeoFeatureSchema = new geogoose.models.GeoFeatureSchema({createdAt: {type: Date, default: Date.now}}),
		GeoFeatureCollectionSchema = new geogoose.models.GeoFeatureCollectionSchema({}, {FeatureSchema: GeoFeatureSchema}),
		GeoFeatureCollection = mongoose.model('TestGeoFeatureCollection', GeoFeatureCollectionSchema),
		featureCollection = new GeoFeatureCollection({_id: new mongoose.Types.ObjectId()}),
		GeoFeature = featureCollection.getFeatureModel();

	it('should create three GeoFeatures with geometry, and one without', function(done) {
		var dequeueSave = function(coordinates) {
			if (!coordinates.length) {
				done();
			} else {
				var c = coordinates.shift();
				new GeoFeature({
					type: "Feature",
					geometry: typeof c == 'undefined' ? null : {
						type:  
							typeof c[0] == 'number' ? "Point" :
							typeof c[0][0] == 'number' ? "LineString"
							: 'Polygon', 
						coordinates: c
					}
				}).save(function(err) {
					if (err) throw err;
					dequeueSave(coordinates);
				});
			}
		};

		dequeueSave([
			[0, -80],
			[[100, 80], [0, 90]],
			[[[10, -50], [0, 0], [10, 0], [10, -50]]],
			undefined
		]);
	});

	it('should find the 3 features with geometry, and return the correct GeoJSON representation', function(done) {
		GeoFeature.withGeometry().find(function(err, features) {
			assert.equal(features.length, 3);
			// TODO: fails, why?
			//assert.deepEqual(features[0].get('geometry.coordinates'), [0, -359]);

			assert.equal(JSON.stringify(features[0].toGeoJSON()), 
				'{"_id":"' + features[0]._id + '","type":"Feature","geometry":{"coordinates":[0,-80],"type":"Point"}}')
			assert.equal(JSON.stringify(features[1].toGeoJSON()), 
				'{"_id":"' + features[1]._id + '","type":"Feature","geometry":{"coordinates":[[100,80],[0,90]],"type":"LineString"},"bbox":[0,80,100,90]}')
			assert.equal(JSON.stringify(features[2].toGeoJSON()), 
				'{"_id":"' + features[2]._id + '","type":"Feature","geometry":{"coordinates":[[[10,-50],[0,0],[10,0],[10,-50]]],"type":"Polygon"},"bbox":[0,-50,10,0]}')
			done();
		});
	});

	it('should find a subset within a Polygon sort them by createdAt', function(done) {
		var bbox = [-1, -80, 100, 1];
		GeoFeature.geoIntersects(coordinates.polygonFromBbox(bbox))
			.sort({'createdAt': -1})
			.exec(function(err, docs) {
				if (err) throw err;
				assert.equal(docs.length, 2);
				done();
			});
	});

	after(function() {
		mongoose.disconnect();
	});

});
