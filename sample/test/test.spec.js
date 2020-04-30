let map, mapElement, manager;

const dummyImageLayerConfig = (id, visble = undefined) => {
	const template = {
		"id": id,
		"type": "raster",
		"source": {
			"type": "image",
			"url": "../1.png",
			"coordinates": [
				[139.7900390625, 35.63944106897394],
				[139.8779296875, 35.63944106897394],
				[139.8779296875, 35.56798045801208],
				[139.7900390625, 35.56798045801208]
			]
		}
	};
	const layout = visble === undefined ? {} : {
		'layout': {
			'visibility': visble
		}
	}
	return Object.assign({}, template, layout)
}

const isVisibleConfig = (layerConfig) => {
	return typeof layerConfig.layout !== 'undefined' && layerConfig.layout.visibility === 'none' ? false : true
}

const getIds = (mamnager, type = 'all', visibility = 'any') => {

	const _getIds = (lyrs) => {
		let ids = []
		lyrs.forEach((lyr) => {
			ids.push({
				id: lyr._id,
				visible: lyr._visible,
				type: (lyr._type === 'multi' || lyr._type === 'single') ? 'group' : 'layer'
			});
			if (Array.isArray(lyr._lyrs)) {
				ids = ids.concat(_getIds(lyr._lyrs))
			}
		})

		return ids
	}
	const lyrs = _getIds(mamnager._lyrs);
	return lyrs.filter((idObj) => {
		const matchVisible = (idObj) => {
			if (visibility === 'any') return true;

			if (visibility === 'visible')
				return idObj.visible === true

			if (visibility === 'none')
				return idObj.visible === false
		}
		if (type === 'all' && matchVisible(idObj)) return true;
		if (type === idObj.type && matchVisible(idObj)) return true;
		return false
	}).map((lyr) => {
		return lyr.id
	})
}

beforeEach(function () {
	mapElement = document.createElement('div');
	mapElement.setAttribute('id', 'map');
	document.querySelector('body').append(mapElement);

	map = new mapboxgl.Map({
		container: "map",
		center: [139.765, 35.65],
		zoom: 10,
		minZoom: 0,
		maxZoom: 18,
	});
	manager = new MapboxLayerManager(map);
});

afterEach(function () {
	manager = null;
	mapElement.parentNode.removeChild(mapElement);
});

describe('init', () => {
	it('default', () => {
		chai.assert.strictEqual(manager.map, map);
	})

	it('separator', () => {
		manager_dot = new MapboxLayerManager(map, {
			separator: '.'
		});
		const groupId1 = 'group1'
		manager_dot.addGroup({
			id: groupId1
		});
		const layerConfig1 = dummyImageLayerConfig(groupId1 + '.image1', );
		manager_dot.addLayer(layerConfig1);

		const groupId2 = 'group1.group2'
		manager_dot.addGroup({
			id: groupId2
		});

		const layerConfig2 = dummyImageLayerConfig(groupId2 + '.image2', );
		manager_dot.addLayer(layerConfig2);

		chai.expect(getIds(manager_dot, 'all'))
			.to.deep.equal([groupId1, layerConfig1.id, groupId2, layerConfig2.id]);

		manager_dot = null;
	});
});

describe('add/remove', () => {
	it('property and order', () => {
		const layerConfig1 = dummyImageLayerConfig('image1', 'visible');
		manager.addLayer(layerConfig1);
		const lyr1 = manager._lyrs[0];
		chai.assert.strictEqual(lyr1._id, layerConfig1.id)
		chai.assert.strictEqual(lyr1._type, layerConfig1.type)
		chai.assert.strictEqual(lyr1._parent, manager)
		chai.assert.strictEqual(lyr1._visible, isVisibleConfig(layerConfig1))
		chai.assert.strictEqual(lyr1._visible, manager.invoke('getLayoutProperty', lyr1._id, 'visibility') === 'visible')

		const layerConfig2 = dummyImageLayerConfig('image2', 'none');
		manager.addLayer(layerConfig2);
		const lyr2 = manager._lyrs[1];
		chai.assert.strictEqual(lyr2._id, layerConfig2.id)
		chai.assert.strictEqual(lyr2._type, layerConfig2.type)
		chai.assert.strictEqual(lyr2._parent, manager)
		chai.assert.strictEqual(lyr2._visible, isVisibleConfig(layerConfig2))
		chai.assert.strictEqual(lyr2._visible, manager.invoke('getLayoutProperty', lyr2._id, 'visibility') === 'visible')

		const layerConfig3 = dummyImageLayerConfig('image3');
		manager.addLayer(layerConfig3, {
			beforeId: layerConfig1.id
		});
		const lyr3 = manager._lyrs[0];
		chai.assert.strictEqual(lyr3._id, layerConfig3.id)
		chai.assert.strictEqual(lyr3._type, layerConfig3.type)
		chai.assert.strictEqual(lyr3._parent, manager)
		chai.assert.strictEqual(lyr3._visible, isVisibleConfig(layerConfig3))
		chai.assert.strictEqual(lyr3._visible, manager.invoke('getLayoutProperty', lyr3._id, 'visibility') === 'visible')

		// number
		chai.assert.strictEqual(getIds(manager, 'layer', 'visible').length, 2)
		chai.assert.strictEqual(getIds(manager, 'layer').length, 3)
		// actual number
		chai.assert.strictEqual(manager.getLayerIds({
			visiblity: 'visible'
		}).length, 2)
		chai.assert.strictEqual(manager.getLayerIds({
			visiblity: 'none'
		}).length, 1)
	});
	it('add underlay', () => {
		const layerConfig1 = dummyImageLayerConfig('image1');
		manager.addLayer(layerConfig1);
		const layerConfig2 = dummyImageLayerConfig('image2');
		manager.addLayer(layerConfig2, {
			fixedTo: 'underlay'
		})
		chai.assert.strictEqual(manager._lyrs[1]._id, layerConfig1.id)
		chai.assert.strictEqual(manager._lyrs[0]._id, layerConfig2.id)

		const layerConfig3 = dummyImageLayerConfig('image3');
		manager.addLayer(layerConfig3, {
			fixedTo: 'underlay'
		})
		chai.assert.strictEqual(manager._lyrs[2]._id, layerConfig1.id)
		chai.assert.strictEqual(manager._lyrs[1]._id, layerConfig2.id)
		chai.assert.strictEqual(manager._lyrs[0]._id, layerConfig3.id)

		// not added
		chai.expect(() => {
			const layerConfigX = dummyImageLayerConfig('imageX');
			manager.addLayer(layerConfigX, {
				beforeId: manager._lyrs[0]
			});
		}).to.throw()
		chai.assert.strictEqual(getIds(manager, 'layer', 'visible').length, 3)
	});

	it('add overlay', () => {
		const layerConfig1 = dummyImageLayerConfig('image1');
		manager.addLayer(layerConfig1);
		const layerConfig2 = dummyImageLayerConfig('image2');
		manager.addLayer(layerConfig2, {
			fixedTo: 'overlay'
		})
		chai.assert.strictEqual(manager._lyrs[0]._id, layerConfig1.id)
		chai.assert.strictEqual(manager._lyrs[1]._id, layerConfig2.id)

		const layerConfig3 = dummyImageLayerConfig('image3');
		manager.addLayer(layerConfig3, {
			fixedTo: 'overlay'
		})
		chai.assert.strictEqual(manager._lyrs[0]._id, layerConfig1.id)
		chai.assert.strictEqual(manager._lyrs[1]._id, layerConfig2.id)
		chai.assert.strictEqual(manager._lyrs[2]._id, layerConfig3.id)

		const layerConfig4 = dummyImageLayerConfig('image4');
		manager.addLayer(layerConfig4);
		chai.assert.strictEqual(manager._lyrs[0]._id, layerConfig1.id)
		chai.assert.strictEqual(manager._lyrs[1]._id, layerConfig2.id)
		chai.assert.strictEqual(manager._lyrs[3]._id, layerConfig3.id)
		chai.assert.strictEqual(manager._lyrs[2]._id, layerConfig4.id)
	});

	it('add group', () => {
		// check order and property
		const id1 = 'group1'
		manager.addGroup({
			id: id1
		});
		const grp1 = manager._lyrs[0];
		chai.assert.strictEqual(grp1._id, id1)
		chai.assert.strictEqual(grp1._type, 'multi')
		chai.assert.strictEqual(grp1._parent, manager)
		chai.assert.strictEqual(grp1._visible, true)

		const id2 = 'group2'
		manager.addGroup({
			id: id2,
			visible: false
		});
		const grp2 = manager._lyrs[1];
		chai.assert.strictEqual(grp2._id, id2)
		chai.assert.strictEqual(grp2._type, 'multi')
		chai.assert.strictEqual(grp2._parent, manager)
		chai.assert.strictEqual(grp2._visible, false)

		const id3 = 'group3'
		manager.addGroup({
			id: id3,
			visible: true,
			type: 'single'
		}, {
			beforeId: id1
		});
		const grp3 = manager._lyrs[0];
		chai.assert.strictEqual(grp3._id, id3)
		chai.assert.strictEqual(grp3._type, 'single')
		chai.assert.strictEqual(grp3._parent, manager)
		chai.assert.strictEqual(grp3._visible, true)

		// number of group
		chai.assert.strictEqual(getIds(manager, 'group', 'visible').length, 2)
		chai.assert.strictEqual(getIds(manager, 'group').length, 3)
		// actual layer
		chai.assert.strictEqual(manager.getLayerIds().length, 0)
	});

	it('add group to underlay', () => {
		const id1 = 'group1'
		manager.addGroup({
			id: id1
		});
		const id2 = 'group2'
		manager.addGroup({
			id: id2
		}, {
			fixedTo: 'underlay'
		});

		chai.assert.strictEqual(manager._lyrs[1]._id, id1)
		chai.assert.strictEqual(manager._lyrs[0]._id, id2)

		const id3 = 'group3'
		manager.addGroup({
			id: id3
		}, {
			fixedTo: 'underlay'
		});
		chai.assert.strictEqual(manager._lyrs[2]._id, id1)
		chai.assert.strictEqual(manager._lyrs[1]._id, id2)
		chai.assert.strictEqual(manager._lyrs[0]._id, id3)

		chai.expect(() => {
			manager.addGroup({
				id: 'groupX'
			}, {
				beforeId: manager._lyrs[0]._id
			});
		}).to.throw()
	});

	it('add group to overlay', () => {
		const id1 = 'group1'
		manager.addGroup({
			id: id1
		});
		const id2 = 'group2'
		manager.addGroup({
			id: id2
		}, {
			fixedTo: 'overlay'
		});

		chai.assert.strictEqual(manager._lyrs[0]._id, id1)
		chai.assert.strictEqual(manager._lyrs[1]._id, id2)

		const id3 = 'group3'
		manager.addGroup({
			id: id3
		}, {
			fixedTo: 'overlay'
		});
		chai.assert.strictEqual(manager._lyrs[0]._id, id1)
		chai.assert.strictEqual(manager._lyrs[1]._id, id2)
		chai.assert.strictEqual(manager._lyrs[2]._id, id3)

		const id4 = 'group4'
		manager.addGroup({
			id: id4
		});
		chai.assert.strictEqual(manager._lyrs[0]._id, id1)
		chai.assert.strictEqual(manager._lyrs[1]._id, id2)
		chai.assert.strictEqual(manager._lyrs[3]._id, id3)
		chai.assert.strictEqual(manager._lyrs[2]._id, id4)
	});


	it('add to group', () => {
		const groupId1 = 'group1'
		manager.addGroup({
			id: groupId1
		});

		const groupId2 = 'group2'
		manager.addGroup({
			id: groupId2
		});
		const layerConfig1 = dummyImageLayerConfig(groupId1 + '/image1', 'visible');
		manager.addLayer(layerConfig1);

		// image1 property
		const lyr1 = manager._lyrs[0]._lyrs[0];
		chai.assert.strictEqual(lyr1._id, layerConfig1.id)
		chai.assert.strictEqual(lyr1._type, layerConfig1.type)
		chai.assert.strictEqual(lyr1._parent, manager._lyrs[0])
		chai.assert.strictEqual(lyr1._visible, isVisibleConfig(layerConfig1))
		chai.assert.strictEqual(lyr1._visible, manager.invoke('getLayoutProperty', lyr1._id, 'visibility') === 'visible')

		const layerConfig2 = dummyImageLayerConfig(groupId2 + '/image2', 'visible');
		manager.addLayer(layerConfig2);
		const layerConfig3 = dummyImageLayerConfig(groupId2 + '/image3', 'none');
		manager.addLayer(layerConfig3);

		const groupId3 = groupId2 + '/group3'
		manager.addGroup({
			id: groupId3,
			type: 'single'
		}, {
			beforeId: layerConfig3.id
		});
		const layerConfig4 = dummyImageLayerConfig(groupId3 + '/image4', 'visible');
		manager.addLayer(layerConfig4);
		const groupId4 = groupId3 + '/group4'
		manager.addGroup({
			id: groupId4,
			type: 'single'
		}, {
			fixedTo: 'overlay'
		});
		const layerConfig5 = dummyImageLayerConfig(groupId4 + '/image5', 'visible');
		manager.addLayer(layerConfig5);

		// group4/image5 property
		const grp4 = manager._lyrs[1]._lyrs[1]._lyrs[1];
		chai.assert.strictEqual(grp4._id, groupId4)
		chai.assert.strictEqual(grp4._type, 'single')
		chai.assert.strictEqual(grp4._parent, manager._lyrs[1]._lyrs[1])
		chai.assert.strictEqual(grp4._visible, true)
		const lyr5 = grp4._lyrs[0];
		chai.assert.strictEqual(lyr5._id, layerConfig5.id)
		chai.assert.strictEqual(lyr5._type, layerConfig5.type)
		chai.assert.strictEqual(lyr5._parent, grp4)
		chai.assert.strictEqual(lyr5._visible, isVisibleConfig(layerConfig5))
		chai.assert.strictEqual(lyr5._visible, manager.invoke('getLayoutProperty', lyr5._id, 'visibility') === 'visible')

		const layerConfig6 = dummyImageLayerConfig(groupId3 + '/image6', 'visible');
		manager.addLayer(layerConfig6, {
			fixedTo: 'overlay'
		});
		// changed by single group
		chai.assert.strictEqual(grp4._visible, false) // changed
		chai.assert.strictEqual(lyr5._visible, isVisibleConfig(layerConfig5)) // not changed


		const groupId5 = 'group5'
		manager.addGroup({
			id: groupId5,
			visible: false,
			type: 'single'
		});
		const layerConfig8 = dummyImageLayerConfig(groupId5 + '/image8', 'none');
		manager.addLayer(layerConfig8, {
			fixedTo: 'underlay'
		});
		chai.assert.strictEqual(manager._lyrs[2]._selectId, '')
		chai.assert.strictEqual(manager._lyrs[2]._underlayId, layerConfig8.id)
		const groupId6 = groupId5 + '/group6'
		manager.addGroup({
			id: groupId6
		}, {
			fixedTo: 'underlay'
		});
		chai.assert.strictEqual(manager._lyrs[2]._selectId, groupId6)
		chai.assert.strictEqual(manager._lyrs[2]._underlayId, groupId6)
		const layerConfig7 = dummyImageLayerConfig(groupId6 + '/image7', 'visible');
		manager.addLayer(layerConfig7);
		const groupId7 = groupId5 + '/group7'
		manager.addGroup({
			id: groupId7,
		}, {
			fixedTo: 'overlay'
		});
		chai.assert.strictEqual(manager._lyrs[2]._selectId, groupId7)
		chai.assert.strictEqual(manager._lyrs[2]._underlayId, groupId6)
		chai.assert.strictEqual(manager._lyrs[2]._overlayId, groupId7)
		const layerConfig9 = dummyImageLayerConfig(groupId7 + '/image9', 'visible');
		manager.addLayer(layerConfig9, {
			fixedTo: 'overlay'
		});
		chai.assert.strictEqual(manager._lyrs[2]._lyrs[2]._overlayId, layerConfig9.id)

		// order
		chai.expect(getIds(manager, 'all'))
			.to.deep.equal([groupId1, layerConfig1.id, groupId2,
				layerConfig2.id, groupId3, layerConfig4.id,
				groupId4, layerConfig5.id, layerConfig6.id, layerConfig3.id,
				groupId5, groupId6, layerConfig7.id, layerConfig8.id, groupId7, layerConfig9.id
			]);
		chai.expect(getIds(manager, 'layer'))
			.to.deep.equal([layerConfig1.id, layerConfig2.id,
				layerConfig4.id, layerConfig5.id, layerConfig6.id, layerConfig3.id,
				layerConfig7.id, layerConfig8.id, layerConfig9.id
			]);
		chai.expect(getIds(manager, 'group')).to.deep.equal([groupId1, groupId2, groupId3, groupId4, groupId5, groupId6, groupId7]);

		chai.expect(getIds(manager, 'all', 'visible'))
			.to.deep.equal([groupId1, layerConfig1.id, groupId2,
				layerConfig2.id, groupId3, layerConfig5.id,
				layerConfig6.id, layerConfig7.id, groupId7, layerConfig9.id
			]);
		chai.expect(getIds(manager, 'layer', 'visible'))
			.to.deep.equal([layerConfig1.id, layerConfig2.id,
				layerConfig5.id, layerConfig6.id, layerConfig7.id, layerConfig9.id
			]);
		chai.expect(getIds(manager, 'group', 'visible'))
			.to.deep.equal([groupId1, groupId2, groupId3, groupId7]);

		// actual layer
		chai.expect(manager.getLayerIds({
				visiblity: 'visible'
			}))
			.to.deep.equal([layerConfig1.id, layerConfig2.id, layerConfig6.id]);

		chai.expect(manager.getLayerIds({
				visiblity: 'none'
			}))
			.to.deep.equal([layerConfig4.id, layerConfig5.id, layerConfig3.id, layerConfig7.id, layerConfig8.id, layerConfig9.id]);

		// rise error(not added)
		chai.expect(() => {
			manager.addGroup('groupX/groupY');
		}).to.throw();
		chai.expect(() => {
			manager.addLayer(dummyImageLayerConfig('groupZ/imageX'));
		}).to.throw();

		chai.expect(() => {
			manager.addLayer(layerConfig2);
		}).to.throw();
		chai.expect(() => {
			manager.addGroup({
				id: groupId7,
			}, {
				fixedTo: 'overlay'
			});
		}).to.throw();
		chai.expect(() => {
			const layerConfigX = dummyImageLayerConfig(groupId5 + '/imageX', 'visible');
			manager.addLayer(layerConfigX, {
				beforeId: groupId6
			});
		}).to.throw();
		chai.expect(() => {
			manager.addGroup({
				id: groupId3 + '/groupX'
			}, {
				beforeId: groupId6
			});
		}).to.throw();
	});

	it('remove layer and group', () => {
		const groupId1 = 'group1'
		manager.addGroup({
			id: groupId1
		});
		const groupId2 = 'group2'
		manager.addGroup({
			id: groupId2
		});
		const layerConfig1 = dummyImageLayerConfig(groupId1 + '/image1', 'visible');
		manager.addLayer(layerConfig1);

		const layerConfig2 = dummyImageLayerConfig(groupId2 + '/image2', 'visible');
		manager.addLayer(layerConfig2);
		const layerConfig3 = dummyImageLayerConfig('image3', 'none');
		manager.addLayer(layerConfig3);

		const groupId3 = groupId2 + '/group3'
		manager.addGroup({
			id: groupId3
		}, {
			beforeId: layerConfig2.id
		});
		const layerConfig4 = dummyImageLayerConfig(groupId3 + '/image4', 'none');
		manager.addLayer(layerConfig4);
		const groupId4 = groupId3 + '/group4'
		manager.addGroup({
			id: groupId4
		});
		const layerConfig5 = dummyImageLayerConfig(groupId4 + '/image5', 'visible');
		manager.addLayer(layerConfig5);

		const layerConfig6 = dummyImageLayerConfig(groupId3 + '/image6', 'visible');
		manager.addLayer(layerConfig6);

		const groupId5 = 'group5'
		manager.addGroup({
			id: groupId5,
			'visible': true
		});
		const layerConfig7 = dummyImageLayerConfig(groupId5 + '/image7', 'visible');
		manager.addLayer(layerConfig7);
		const layerConfig8 = dummyImageLayerConfig(groupId5 + '/image8', 'none');
		manager.addLayer(layerConfig8);
		const groupId6 = groupId5 + '/group6'
		manager.addGroup({
			id: groupId6,
			type: 'single'
		});
		const layerConfig9 = dummyImageLayerConfig(groupId6 + '/image9', 'visible');
		manager.addLayer(layerConfig9);
		const groupId7 = groupId6 + '/group7'
		manager.addGroup({
			id: groupId7
		});

		// check order
		chai.expect(getIds(manager, 'all'))
			.to.deep.equal([groupId1, layerConfig1.id, groupId2,
				groupId3, layerConfig4.id,
				groupId4, layerConfig5.id, layerConfig6.id, layerConfig2.id, layerConfig3.id,
				groupId5, layerConfig7.id, layerConfig8.id, groupId6, layerConfig9.id, groupId7
			]);
		chai.expect(manager.getLayerIds({
				visiblity: 'visible'
			}))
			.to.deep.equal([layerConfig1.id, layerConfig5.id, layerConfig6.id, layerConfig2.id, layerConfig7.id]);
		chai.expect(manager.getLayerIds({
				visiblity: 'any'
			}))
			.to.deep.equal([layerConfig1.id,
				layerConfig4.id,
				layerConfig5.id, layerConfig6.id, layerConfig2.id, layerConfig3.id,
				layerConfig7.id, layerConfig8.id, layerConfig9.id
			]);

		manager.removeLayer(layerConfig6.id);
		chai.expect(manager.getLayerIds({
				visiblity: 'visible'
			}))
			.to.deep.equal([layerConfig1.id, layerConfig5.id, layerConfig2.id, layerConfig7.id]);
		chai.expect(getIds(manager, 'all'))
			.to.deep.equal([groupId1, layerConfig1.id, groupId2,
				groupId3, layerConfig4.id,
				groupId4, layerConfig5.id, layerConfig2.id, layerConfig3.id,
				groupId5, layerConfig7.id, layerConfig8.id, groupId6, layerConfig9.id, groupId7
			]);
		chai.expect(manager.getLayerIds({
				visiblity: 'any'
			}))
			.to.deep.equal([layerConfig1.id,
				layerConfig4.id,
				layerConfig5.id, layerConfig2.id, layerConfig3.id,
				layerConfig7.id, layerConfig8.id, layerConfig9.id
			]);


		manager.removeGroup(groupId4);
		chai.expect(manager.getLayerIds({
				visiblity: 'visible'
			}))
			.to.deep.equal([layerConfig1.id, layerConfig2.id, layerConfig7.id]);
		chai.expect(getIds(manager, 'all'))
			.to.deep.equal([groupId1, layerConfig1.id, groupId2,
				groupId3, layerConfig4.id, layerConfig2.id, layerConfig3.id,
				groupId5, layerConfig7.id, layerConfig8.id, groupId6, layerConfig9.id, groupId7
			]);

		chai.expect(manager.getLayerIds({
				visiblity: 'any'
			}))
			.to.deep.equal([layerConfig1.id,
				layerConfig4.id, layerConfig2.id, layerConfig3.id,
				layerConfig7.id, layerConfig8.id, layerConfig9.id
			]);

		chai.assert.strictEqual(manager._lyrs[3]._lyrs[2]._selectId, groupId7)
		manager.removeGroup(groupId7);
		chai.assert.strictEqual(manager._lyrs[3]._lyrs[2]._selectId, '')
		chai.expect(getIds(manager, 'all'))
			.to.deep.equal([groupId1, layerConfig1.id, groupId2,
				groupId3, layerConfig4.id, layerConfig2.id, layerConfig3.id,
				groupId5, layerConfig7.id, layerConfig8.id, groupId6, layerConfig9.id
			]);

		manager.removeGroup(groupId5);
		chai.expect(getIds(manager, 'all'))
			.to.deep.equal([groupId1, layerConfig1.id, groupId2,
				groupId3, layerConfig4.id, layerConfig2.id, layerConfig3.id
			]);
		chai.expect(manager.getLayerIds({
				visiblity: 'visible'
			}))
			.to.deep.equal([layerConfig1.id, layerConfig2.id]);
		chai.expect(manager.getLayerIds({
				visiblity: 'any'
			}))
			.to.deep.equal([layerConfig1.id,
				layerConfig4.id, layerConfig2.id, layerConfig3.id
			]);

		// rise error(not added)
		chai.expect(() => {
			manager.removeGroup(layerConfig1.id);
		}).to.throw();
		chai.expect(() => {
			manager.removeLayer(groupId1);
		}).to.throw();

	});
	it('removed form map', () => {
		const groupId1 = 'group1'
		manager.addGroup({
			id: groupId1
		});

		const layerConfig1 = dummyImageLayerConfig(groupId1 + '/image1', 'visible');
		manager.addLayer(layerConfig1);
		const layerConfig2 = dummyImageLayerConfig('image2', 'none');
		manager.addLayer(layerConfig2);

		chai.expect(manager.getLayerIds({
				visiblity: 'any'
			}))
			.to.deep.equal([layerConfig1.id, layerConfig2.id]);
		chai.expect(typeof manager.map.getLayer(layerConfig1.id)).to.not.equal('undefined');
		chai.expect(typeof manager.map.getLayer(layerConfig2.id)).to.not.equal('undefined');
		manager.removeGroup(groupId1);
		manager.removeLayer(layerConfig2.id);
		chai.expect(typeof manager.map.getLayer(layerConfig1.id)).to.equal('undefined');
		chai.expect(typeof manager.map.getLayer(layerConfig2.id)).to.equal('undefined');
		chai.expect(manager.getLayerIds({
				visiblity: 'any'
			}))
			.to.deep.equal([]);
	})
});

describe('change order', () => {
	it('move', () => {
		const layerConfig0 = dummyImageLayerConfig('image0', 'visible');
		manager.addLayer(layerConfig0, {
			fixedTo: 'underlay'
		});

		const groupId1 = 'group1'
		manager.addGroup({
			id: groupId1
		});
		const groupId2 = 'group2'
		manager.addGroup({
			id: groupId2
		});
		const layerConfig1 = dummyImageLayerConfig(groupId1 + '/image1', 'visible');
		manager.addLayer(layerConfig1);

		const layerConfig2 = dummyImageLayerConfig(groupId2 + '/image2', 'visible');
		manager.addLayer(layerConfig2);
		const layerConfig3 = dummyImageLayerConfig('image3', 'none');
		manager.addLayer(layerConfig3);

		const groupId3 = groupId2 + '/group3'
		manager.addGroup({
			id: groupId3,
			type: 'single'
		}, {
			beforeId: layerConfig2.id
		});
		const layerConfig4 = dummyImageLayerConfig(groupId3 + '/image4', 'visible');
		manager.addLayer(layerConfig4);
		const groupId4 = groupId3 + '/group4'
		manager.addGroup({
			id: groupId4
		});
		const layerConfig5 = dummyImageLayerConfig(groupId4 + '/image5', 'visible');
		manager.addLayer(layerConfig5);
		const layerConfig6 = dummyImageLayerConfig(groupId3 + '/image6', 'visible');
		manager.addLayer(layerConfig6, {
			fixedTo: 'overlay'
		});

		const groupId5 = 'group5'
		manager.addGroup({
			id: groupId5,
			visible: false
		}, {
			fixedTo: 'overlay'
		});
		const layerConfig8 = dummyImageLayerConfig(groupId5 + '/image8', 'none');
		manager.addLayer(layerConfig8, {
			fixedTo: 'underlay'
		});
		const groupId6 = groupId5 + '/group6'
		manager.addGroup({
			id: groupId6
		}, {
			fixedTo: 'underlay'
		});
		const layerConfig7 = dummyImageLayerConfig(groupId6 + '/image7', 'visible');
		manager.addLayer(layerConfig7);
		const groupId7 = groupId5 + '/group7'
		manager.addGroup({
			id: groupId7
		});
		const layerConfig9 = dummyImageLayerConfig(groupId7 + '/image9', 'visible');
		manager.addLayer(layerConfig9);

		// check order
		chai.expect(getIds(manager, 'all'))
			.to.deep.equal([layerConfig0.id, groupId1, layerConfig1.id, groupId2,
				groupId3, layerConfig4.id,
				groupId4, layerConfig5.id, layerConfig6.id, layerConfig2.id, layerConfig3.id,
				groupId5, groupId6, layerConfig7.id, layerConfig8.id, groupId7, layerConfig9.id
			]);
		manager.move(groupId1, layerConfig3.id);
		chai.expect(getIds(manager, 'all'))
			.to.deep.equal([layerConfig0.id, groupId2, groupId3, layerConfig4.id,
				groupId4, layerConfig5.id, layerConfig6.id, layerConfig2.id,
				groupId1, layerConfig1.id, layerConfig3.id,
				groupId5, groupId6, layerConfig7.id, layerConfig8.id, groupId7, layerConfig9.id
			]);

		// rise error
		chai.expect(() => {
			manager.move(layerConfig0.id, layerConfig3.id);
		}).to.throw();
		chai.expect(() => {
			manager.move(layerConfig4.id);
		}).to.throw();
		chai.expect(() => {
			manager.move(groupId6, groupId7);
		}).to.throw();
		chai.expect(() => {
			manager.move(groupId5, groupId1);
		}).to.throw();
	});
});

describe('change visiblity', () => {
	it('show/hide', () => {
		const layerConfig0 = dummyImageLayerConfig('image0', 'visible');
		manager.addLayer(layerConfig0, {
			fixedTo: 'underlay'
		});

		const groupId1 = 'group1'
		manager.addGroup({
			id: groupId1
		});
		const groupId2 = 'group2'
		manager.addGroup({
			id: groupId2
		});
		const layerConfig1 = dummyImageLayerConfig(groupId1 + '/image1', 'visible');
		manager.addLayer(layerConfig1);

		const layerConfig2 = dummyImageLayerConfig(groupId2 + '/image2', 'visible');
		manager.addLayer(layerConfig2);
		const layerConfig3 = dummyImageLayerConfig('image3', 'none');
		manager.addLayer(layerConfig3);

		const groupId3 = groupId2 + '/group3'
		manager.addGroup({
			id: groupId3,
			type: 'single'
		}, {
			beforeId: layerConfig2.id
		});
		const layerConfig4 = dummyImageLayerConfig(groupId3 + '/image4', 'visible');
		manager.addLayer(layerConfig4);
		const groupId4 = groupId3 + '/group4'
		manager.addGroup({
			id: groupId4
		});
		const layerConfig5 = dummyImageLayerConfig(groupId4 + '/image5', 'visible');
		manager.addLayer(layerConfig5);
		const layerConfig6 = dummyImageLayerConfig(groupId3 + '/image6', 'visible');
		manager.addLayer(layerConfig6, {
			fixedTo: 'overlay'
		});

		const groupId5 = 'group5'
		manager.addGroup({
			id: groupId5,
			visible: false
		}, {
			fixedTo: 'overlay'
		});
		const layerConfig8 = dummyImageLayerConfig(groupId5 + '/image8', 'none');
		manager.addLayer(layerConfig8, {
			fixedTo: 'underlay'
		});
		const groupId6 = groupId5 + '/group6'
		manager.addGroup({
			id: groupId6
		}, {
			fixedTo: 'underlay'
		});
		const layerConfig7 = dummyImageLayerConfig(groupId6 + '/image7', 'visible');
		manager.addLayer(layerConfig7);
		const layerConfig9 = dummyImageLayerConfig(groupId6 + '/image9', 'none');
		manager.addLayer(layerConfig9);

		// check order
		chai.expect(getIds(manager, 'all', 'visible'))
			.to.deep.equal([layerConfig0.id, groupId1, layerConfig1.id, groupId2,
				groupId3, layerConfig5.id, layerConfig6.id, layerConfig2.id,
				groupId6, layerConfig7.id
			]);
		chai.expect(manager.getLayerIds({
				visiblity: 'visible'
			}))
			.to.deep.equal([layerConfig0.id, layerConfig1.id,
				layerConfig6.id, layerConfig2.id
			]);
		manager.hide(layerConfig0.id)
		chai.expect(getIds(manager, 'all', 'visible'))
			.to.deep.equal([groupId1, layerConfig1.id, groupId2,
				groupId3, layerConfig5.id, layerConfig6.id, layerConfig2.id,
				groupId6, layerConfig7.id
			]);
		chai.expect(manager.getLayerIds({
				visiblity: 'visible'
			}))
			.to.deep.equal([layerConfig1.id,
				layerConfig6.id, layerConfig2.id
			]);
		manager.show(layerConfig0.id)
		chai.expect(getIds(manager, 'all', 'visible'))
			.to.deep.equal([layerConfig0.id, groupId1, layerConfig1.id, groupId2,
				groupId3, layerConfig5.id, layerConfig6.id, layerConfig2.id,
				groupId6, layerConfig7.id
			]);
		chai.expect(manager.getLayerIds({
				visiblity: 'visible'
			}))
			.to.deep.equal([layerConfig0.id, layerConfig1.id,
				layerConfig6.id, layerConfig2.id
			]);
		manager.show(groupId5)
		chai.expect(getIds(manager, 'all', 'visible'))
			.to.deep.equal([layerConfig0.id, groupId1, layerConfig1.id, groupId2,
				groupId3, layerConfig5.id, layerConfig6.id, layerConfig2.id, groupId5,
				groupId6, layerConfig7.id
			]);
		chai.expect(manager.getLayerIds({
				visiblity: 'visible'
			}))
			.to.deep.equal([layerConfig0.id, layerConfig1.id,
				layerConfig6.id, layerConfig2.id, layerConfig7.id
			]);
		manager.hide(groupId5);
		chai.expect(getIds(manager, 'all', 'visible'))
			.to.deep.equal([layerConfig0.id, groupId1, layerConfig1.id, groupId2,
				groupId3, layerConfig5.id, layerConfig6.id, layerConfig2.id,
				groupId6, layerConfig7.id
			]);
		chai.expect(manager.getLayerIds({
				visiblity: 'visible'
			}))
			.to.deep.equal([layerConfig0.id, layerConfig1.id,
				layerConfig6.id, layerConfig2.id
			]);

		manager.hide(groupId2, {
			force: true
		})
		chai.expect(getIds(manager, 'all', 'visible'))
			.to.deep.equal([layerConfig0.id, groupId1, layerConfig1.id,
				groupId6, layerConfig7.id
			]);
		chai.expect(manager.getLayerIds({
				visiblity: 'visible'
			}))
			.to.deep.equal([layerConfig0.id, layerConfig1.id]);
		manager.show(groupId2, {
			force: true
		})
		chai.expect(getIds(manager, 'all', 'visible'))
			.to.deep.equal([layerConfig0.id, groupId1, layerConfig1.id, groupId2,
				groupId3, layerConfig6.id, layerConfig2.id,
				groupId6, layerConfig7.id
			]);
		chai.expect(manager.getLayerIds({
				visiblity: 'visible'
			}))
			.to.deep.equal([layerConfig0.id, layerConfig1.id,
				layerConfig6.id, layerConfig2.id
			]);

		manager.hide(groupId5, {
			force: true
		})
		chai.expect(getIds(manager, 'all', 'visible'))
			.to.deep.equal([layerConfig0.id, groupId1, layerConfig1.id, groupId2,
				groupId3, layerConfig6.id, layerConfig2.id
			]);
		chai.expect(manager.getLayerIds({
				visiblity: 'visible'
			}))
			.to.deep.equal([layerConfig0.id, layerConfig1.id,
				layerConfig6.id, layerConfig2.id
			]);

		manager.show(groupId5, {
			force: true
		})
		chai.expect(getIds(manager, 'all', 'visible'))
			.to.deep.equal([layerConfig0.id, groupId1, layerConfig1.id, groupId2,
				groupId3, layerConfig6.id, layerConfig2.id, groupId5,
				groupId6, layerConfig7.id, layerConfig9.id, layerConfig8.id
			]);
		chai.expect(manager.getLayerIds({
				visiblity: 'visible'
			}))
			.to.deep.equal([layerConfig0.id, layerConfig1.id,
				layerConfig6.id, layerConfig2.id, layerConfig7.id, layerConfig9.id, layerConfig8.id
			]);

	});
});

describe('type', () => {
	it('shapes', () => {
		const groupId1 = 'group1'
		manager.addGroup({
			id: groupId1
		});
		const layerConfig1 = dummyImageLayerConfig(groupId1 + '/image1', 'visible');
		manager.addLayer(layerConfig1, {
			fixedTo: 'underlay'
		});

		const layerConfig2 = dummyImageLayerConfig(groupId1 + '/image2', 'visible');
		manager.addLayer(layerConfig2, {
			fixedTo: 'overlay'
		});

		manager.addSource('shape', {
			type: 'geojson',
			data: '../shape.geojson'
		});
		const shapeId1 = groupId1 + '/polygon'
		manager.addLayer({
			'id': shapeId1,
			'type': 'fill',
			'source': 'shape',
			'paint': {
				'fill-color': [
					"get", "fillColor"
				],
				'fill-opacity': [
					"get", "fillOpacity"
				]
			},
			'filter': ['==', 'drawtype', 'polygon']
		});
		const shapeId2 = groupId1 + '/point'
		manager.addLayer({
			'id': shapeId2,
			'type': 'circle',
			'source': 'shape',
			'paint': {
				'circle-radius': 10,
				'circle-color': [
					"get", "fillColor"
				],
				'circle-opacity': [
					"get", "fillOpacity"
				]
			},
			'filter': ['==', 'drawtype', 'circle'],
			'layout': {
				'visibility': 'none'
			}
		});
		const shapeId3 = groupId1 + '/line'
		manager.addLayer({
			'id': shapeId3,
			'type': 'line',
			'source': 'shape',
			'layout': {
				'line-join': 'round',
				'line-cap': 'round'
			},
			'paint': {
				'line-color': [
					"get", "color"
				],
				'line-width': [
					"get", "weight"
				],
				'line-opacity': [
					"get", "opacity"
				]
			},
			'filter': ['==', 'drawtype', 'polyline']
		});

		chai.expect(getIds(manager, 'all', 'visible'))
			.to.deep.equal([groupId1, layerConfig1.id, shapeId1, shapeId3, layerConfig2.id]);
		chai.expect(manager.getLayerIds({
				visiblity: 'visible'
			}))
			.to.deep.equal([layerConfig1.id, shapeId1, shapeId3, layerConfig2.id]);

		manager.show(shapeId2)
		manager.hide(shapeId1)

		chai.expect(getIds(manager, 'all', 'visible'))
			.to.deep.equal([groupId1, layerConfig1.id, shapeId2, shapeId3, layerConfig2.id]);
		chai.expect(manager.getLayerIds({
				visiblity: 'visible'
			}))
			.to.deep.equal([layerConfig1.id, shapeId2, shapeId3, layerConfig2.id]);

	});
});

describe('others', () => {
	it('invoke', () => {
		const layerConfig1 = dummyImageLayerConfig('image1', 'visible');
		manager.addLayer(layerConfig1);
		chai.assert.strictEqual(manager.invoke('getLayer', layerConfig1.id).id, layerConfig1.id)
	})

	it('opacity', () => {
		const groupId1 = 'group1'
		manager.addGroup({
			id: groupId1
		});
		const layerConfig1 = dummyImageLayerConfig(groupId1 + '/image1', 'visible');
		manager.addLayer(layerConfig1, {
			fixedTo: 'underlay'
		});

		const layerConfig2 = dummyImageLayerConfig(groupId1 + '/image2', 'visible');
		manager.addLayer(layerConfig2, {
			fixedTo: 'overlay'
		});

		const groupId2 = 'group1/group2'
		manager.addGroup({
			id: groupId2
		});

		manager.addSource('shape', {
			type: 'geojson',
			data: '../shape.geojson'
		});
		const shapeId1 = groupId1 + '/polygon'
		manager.addLayer({
			'id': shapeId1,
			'type': 'fill',
			'source': 'shape',
			'paint': {
				'fill-color': [
					"get", "fillColor"
				],
				'fill-opacity': [
					"get", "fillOpacity"
				]
			},
			'filter': ['==', 'drawtype', 'polygon']
		});
		const shapeId2 = groupId1 + '/point'
		manager.addLayer({
			'id': shapeId2,
			'type': 'circle',
			'source': 'shape',
			'paint': {
				'circle-radius': {
					stops: [
						[0, 1],
						[16, 120]
					]
				},
				'circle-color': [
					"get", "fillColor"
				],
				'circle-opacity': [
					"get", "fillOpacity"
				]
			},
			'filter': ['==', 'drawtype', 'circle'],
			'layout': {
				'visibility': 'none'
			}
		});
		const shapeId3 = groupId2 + '/line'
		manager.addLayer({
			'id': shapeId3,
			'type': 'line',
			'source': 'shape',
			'layout': {
				'line-join': 'round',
				'line-cap': 'round'
			},
			'paint': {
				'line-color': [
					"get", "color"
				],
				'line-width': [
					"get", "weight"
				],
				'line-opacity': [
					"get", "opacity"
				]
			},
			'filter': ['==', 'drawtype', 'polyline']
		});

		const layerConfig3 = dummyImageLayerConfig(groupId2 + '/image2', 'visible');
		manager.addLayer(layerConfig3);

		const getOpacities = (id) => {
			return manager.getLayerIds({
				id: id
			}).map((id) => {
				const type = manager.invoke("getLayer", id).type;
				// not support symbol/hillshade
				return manager.invoke("getPaintProperty",
					id,
					type + '-opacity'
				);
			});
		}

		manager.setOpacity(groupId1, 0.8)
		chai.expect(getOpacities(groupId1))
			.to.deep.equal([0.8, 0.8, 0.8, 0.8, 0.8, 0.8]);

		manager.setOpacity(groupId2, 0.1)
		chai.expect(getOpacities(groupId1))
			.to.deep.equal([0.8, 0.1, 0.1, 0.8, 0.8, 0.8]);
	});
});