import extend from 'jquery-extend';
import {
	version
} from '../package.json';
const PATH_SEPARATOR = '/'

const adjustIndex = (list, index) => {
	/**
	 * インデックスを配列の範囲内に整形する
	 * @param {number} index - 添字
	 * @param {*[]} list - 配列
	 * @return {number} 配列の範囲に収まった添字、範囲外の場合list.length(末尾)
	 */
	if (typeof index !== 'number' || index > list.length || index < 0) {
		index = list.length;
	}
	return index
}

const getIndexByKey = (list, key, value) => {
	/**
	 * オブジェクトの配列からキーの値が一致するオブジェクトのインデックスを返す
	 * @param {*[]} list - 配列
	 * @param {string} key - 探索対象のキー
	 * @param {*} value - 探索対象の値
	 * @return {number} 値が一致したオブジェクトの配列
	 */
	for (let i = 0; i < list.length; i++) {
		if (list[i][key] === value) return i;
	}
	return -1;
}

const getFirstLayerId = (lyrs, afterId = undefined) => {
	/**
	 * 先頭のレイヤーのIDを返す
	 * @param {Lyr|LyrGrp[]} lyrs - 配列
	 * @param {string} afterId - 1階層目において、このIDの要素より後ろのレイヤーを探索対象とする
	 * @return {string} 対象のレイヤー内で先頭のレイヤーのID
	 */
	let startIndex;
	if (typeof afterId === 'undefined') {
		startIndex = 0;
	} else {
		const afterIndex = getIndexByKey(lyrs, '_id', afterId)
		startIndex = afterIndex + 1;
	}
	if (startIndex >= lyrs.length) return;

	for (let i = startIndex; i < lyrs.length; i++) {
		const lyr = lyrs[i];
		if (lyr instanceof Lyr) {
			return lyr._id;
		} else {
			const id = getFirstLayerId(lyr._lyrs)
			if (id) return id;
		}
	}
}

const addList = (target, list, index = undefined) => {
	/**
	 * 配列に対象を加える(破壊的)
	 * @param {*} target - 対象
	 * @param {*[]} list - 配列
	 * @param {number} index - 添字 範囲外または未指定の場合末尾に加えられる
	 */
	index = adjustIndex(list, index);
	list.splice(index, 0, target);
}

const removeList = (target, list) => {
	/**
	 * 対象が配列に含まれていた場合削除する(破壊的)
	 * @param {number} target - 対象
	 * @param {*[]} list - 配列
	 */
	if (list.includes(target))
		return list.splice(list.indexOf(target), 1);
}

const getParentPath = (path) => {
	/**
	 * 親のIDを取得する
	 * @param {string} path - パス
	 * @param {string} parentPath - 親グループのパス
	 */
	const index = path.lastIndexOf(PATH_SEPARATOR);
	if (index < 0) return "";

	return path.slice(0, index);
}

const getOpacityPropertyNames = (type) => {
	const names = [];

	const types = ['fill', 'line', 'raster', 'circle', 'fill-extrusion', 'heatmap']
	if (types.indexOf(type) >= 0) {
		names.push(type + '-opacity');
	}

	if (type === "symbol") {
		names.push('icon-opacity');
		names.push('text-opacity');
	}

	return names
}

class Lyr {
	constructor(id, parent, options = {}) {
		this._id = id;
		this._parent = parent;
		this._type = options.type;
		this._visible = options.visible;
	}
}
class LyrGrp {
	constructor(map, id, parent) {
		this._map = map;
		this._lyrs = []
		this._id = id;
		this._parent = parent;
		this._underlayId = '';
		this._overlayId = '';
	}


	_show(id, root, options = {}) {
		options = extend(true, {
			force: false,
			onVisiblePath: true,
		}, options);
		const force = options.force;
		const onVisiblePath = options.onVisiblePath;
		const lyr = this._lyrs[getIndexByKey(this._lyrs, '_id', id)];

		if (lyr) {
			if (root === true || force === true)
				lyr._visible = true;
			if (lyr instanceof Lyr) {
				if (onVisiblePath === true && lyr._visible === true)
					this._map.setLayoutProperty(lyr._id, 'visibility', 'visible');
			} else {
				lyr._lyrs.forEach((child) => {
					lyr._show(child._id, false, options)
				})
			}
		}
	}

	_hide(id, root, options = {}) {
		options = extend(true, {
			force: false
		}, options);
		const force = options.force;
		const lyr = this._lyrs[getIndexByKey(this._lyrs, '_id', id)];

		if (lyr) {
			if (root === true || force === true)
				lyr._visible = false;
			if (lyr instanceof Lyr) {
				if (this._map.getLayer(lyr._id))
					this._map.setLayoutProperty(lyr._id, 'visibility', 'none');
			} else {
				lyr._lyrs.forEach((child) => {
					lyr._hide(child._id, false, options)
				})
			}
		}
	}

	_addGroup(layerConfig, options = {}) {
		layerConfig = extend(true, {
			type: 'multi',
			visible: true,
		}, layerConfig);

		options = extend(true, {
			fixedTo: '',
			beforeId: undefined
		}, options);
		const groupId = layerConfig.id;
		const groupType = layerConfig.type;
		const visible = layerConfig.visible;
		const beforeId = options.beforeId;
		const fixedTo = options.fixedTo;
		if (getIndexByKey(this._lyrs, '_id', groupId) >= 0) throw new Error(`${groupId} already exists on this manager.`);

		let index;
		if (fixedTo === 'overlay') {
			index = this._lyrs.length;
			this._overlayId = groupId;
		} else if (fixedTo === 'underlay') {
			index = 0;
			this._underlayId = groupId;
		} else {
			if (beforeId) {
				const parentPath = getParentPath(groupId);
				const beforeParentPath = getParentPath(beforeId);
				if (parentPath !== beforeParentPath) {
					throw new Error('beforeId is not same group.');
				}
				const beforeIndex = getIndexByKey(this._lyrs, '_id', beforeId);
				if (this._underlayId !== '' && beforeIndex === 0)
					throw new Error('can\'t overwrite fixed layer.');

				index = beforeIndex;
			} else {
				index = this._lyrs.length;
			}

			if (this._underlayId !== '' && index === 0) index = 1;
			if (this._overlayId !== '' && index === this._lyrs.length)
				index = this._lyrs.length > 0 ? this._lyrs.length - 1 : 0;
		}

		let group
		if (groupType === 'switch') {
			group = new SwitchLyrGrp(this._map, groupId, this, {
				visible
			})
		} else {
			group = new MultiLyrGrp(this._map, groupId, this, {
				visible
			})
		}
		addList(group, this._lyrs, index);
	}

	_removeGroup(groupId) {
		const grplyr = this._lyrs[getIndexByKey(this._lyrs, '_id', groupId)];
		if (!grplyr instanceof LyrGrp) throw new Error(`${groupId} does not exist on this manager.`);

		if (groupId === this._overlayId) {
			this._overlayId = '';
		} else if (groupId === this._underlayId) {
			this._underlayId = '';
		}

		const _remove = (grplyr) => {
			while (grplyr._lyrs.length > 0) {
				const child = grplyr._lyrs.pop();
				if (child instanceof LyrGrp) {
					_remove(child);
				} else {
					if (this._map.getLayer(child.id))
						this._map.removeLayer(child.id)
				}
			}
		}

		_remove(grplyr);
		removeList(grplyr, this._lyrs);
	}

	_addLayer(layerConfig, options = {}) {
		options = extend(true, {
			fixedTo: '',
			beforeId: undefined,
			onVisiblePath: true
		}, options);

		const beforeId = options.beforeId;
		const fixedTo = options.fixedTo;
		const onVisiblePath = options.onVisiblePath;
		const parentNextLayerId = options.parentNextLayerId;

		const id = layerConfig.id;
		if (typeof id === 'undefined') throw new Error(`id is required.`);
		if (getIndexByKey(this._lyrs, '_id', id) >= 0) throw new Error(`${id} already exists on this manager.`);

		if (typeof layerConfig.layout === 'undefined' || typeof layerConfig.layout.visibility === 'undefined')
			layerConfig = extend(true, {
				layout: {
					visibility: 'visible'
				}
			}, layerConfig)
		const visible = layerConfig.layout.visibility === 'visible' ? true : false;
		if (!onVisiblePath) layerConfig.layout.visibility = 'none';
		const type = layerConfig.type;

		const lyr = new Lyr(id, this, {
			type,
			visible
		});
		let index;
		if (fixedTo === 'overlay') {
			index = this._lyrs.length;
			this._overlayId = id;
		} else if (fixedTo === 'underlay') {
			index = 0;
			this._underlayId = id;
		} else {
			if (beforeId) {
				const parentPath = getParentPath(id);
				const beforeParentPath = getParentPath(beforeId);
				if (parentPath !== beforeParentPath) throw new Error('beforeId is not same group.');

				const beforeIndex = getIndexByKey(this._lyrs, '_id', beforeId);
				if (beforeIndex < 0) throw new Error('not found beforeId\'s layer.');
				if (this._underlayId !== '' && beforeIndex === 0)
					throw new Error('can\'t overwrite fixed layer.');
				index = beforeIndex;
			} else {
				index = this._lyrs.length;
			}
			if (index === 0 && this._underlayId !== '') index = 1;
			if (index === this._lyrs.length && this._overlayId !== '')
				index = this._lyrs.length > 0 ? this._lyrs.length - 1 : 0;
		}

		addList(lyr, this._lyrs, index);

		let beforeLayerId;
		if (index === this._lyrs.length - 1) {
			beforeLayerId = parentNextLayerId;
		} else {
			beforeLayerId = getFirstLayerId(this._lyrs, lyr._id);
			if (typeof beforeLayerId === 'undefined')
				beforeLayerId = parentNextLayerId;
		}
		this._map.addLayer(layerConfig, beforeLayerId);
	}

	_removeLayer(id) {
		const lyr = this._lyrs[getIndexByKey(this._lyrs, '_id', id)];
		if (!lyr instanceof Lyr) throw new Error('This id is not layer.');

		if (id === this._overlayId) {
			this._overlayId = '';
		} else if (id === this._underlayId) {
			this._underlayId = '';
		}

		removeList(lyr, this._lyrs);
		this._map.removeLayer(id)
	}
}

class MultiLyrGrp extends LyrGrp {
	constructor(map, id, parent, options = {}) {
		options = extend(true, {
			visible: true
		}, options);
		super(map, id, parent)
		this._type = 'multi'
		this._visible = options.visible;
	}
}

class SwitchLyrGrp extends LyrGrp {
	constructor(map, id, parent, options = {}) {
		options = extend(true, {
			visible: true
		}, options);
		super(map, id, parent)
		this._type = 'switch'
		this._visible = options.visible;
		this._selectId = ''
	}

	_show(id, root, options = {}) {
		if (root) {
			this._selectId = id;
			super._show(id, root, options);
			this._lyrs.forEach((lyr) => {
				if (lyr.id !== id)
					this._hide(lyr.id, true)

			})
		} else {
			if (this._selectId === id)
				super._show(id, root, options);
		}
	}

	_addGroup(layerConfig, options = {}) {
		super._addGroup(layerConfig, options);

		if (layerConfig.visible !== false) {
			this._selectId = layerConfig.id;
			this._lyrs.forEach((otherLyr) => {
				if (otherLyr._id !== layerConfig.id)
					this._hide(otherLyr._id, true)
			})
		}
	}
	_removeGroup(groupId) {
		super._removeGroup(groupId);
		if (this._selectId === groupId)
			this._selectId = '';
	}

	_addLayer(layerConfig, options = {}) {
		super._addLayer(layerConfig, options);
		if (typeof layerConfig.layout === 'undefined' || layerConfig.layout.visibility === 'visible') {
			this._selectId = layerConfig.id;
			this._lyrs.forEach((otherLyr) => {
				if (otherLyr._id !== layerConfig.id)
					this._hide(otherLyr._id, true)
			})
		}
	}

	_removeLayer(id) {
		super._removeLayer(id);
		if (this._selectId === id)
			this._selectId = '';
	}

}

class MapboxLayerManager extends LyrGrp {
	constructor(map, options = {}) {
		super(map, 'manager', undefined, options)
		this.options = options;
		this.version = version;
		return this;
	}

	_getById(id) {
		if (id === "") return this;

		const _get = (parent, path, stage) => {
			const chained = path.split(PATH_SEPARATOR);
			const id = chained.slice(0, stage + 1).join(PATH_SEPARATOR)
			const index = getIndexByKey(parent._lyrs, '_id', id);
			if (index >= 0) {
				const lyr = parent._lyrs[index];

				if (id !== path && lyr instanceof LyrGrp) {
					return _get(lyr, path, ++stage)
				} else {
					return lyr
				}
			}
		}
		return _get(this, id, 0)
	}

	_getParentNextLayerId(lyr) {
		if (lyr !== this) {
			const id = lyr._id;
			const parent = lyr._parent;
			let nextLayerId = getFirstLayerId(lyr._lyrs, id);
			if (typeof nextLayerId === 'undefined') {
				nextLayerId = getFirstLayerId(parent._lyrs, id);
			}

			return nextLayerId;
		}
	}

	_onVisiblePath(lyr) {
		if (lyr === this)
			return true

		if (lyr._visible !== true) return false;
		return this._onVisiblePath(lyr._parent);
	}

	addGroup(layerConfig, options) {
		const id = layerConfig.id;
		if (typeof id === 'undefined') throw new Error(`id is required.`);

		if (this._getById(id)) throw new Error(`Layer/Group with id "${id}" already exists on this manager.`);

		const parentPath = getParentPath(id);
		const parent = this._getById(parentPath);
		if (typeof parent === 'undefined') throw new Error('not found parent layer group.');

		parent._addGroup(layerConfig, options);
	}

	removeGroup(groupId) {
		const grplyr = this._getById(groupId);
		if (!(grplyr instanceof LyrGrp)) throw new Error('This id is not group.');

		const parent = grplyr._parent;
		parent._removeGroup(grplyr._id);
	}

	addLayer(layerConfig, options) {
		const id = layerConfig.id;
		if (typeof id === 'undefined') throw new Error(`id is required.`);

		if (this._getById(id)) throw new Error(`Layer/Group with id "${id}" already exists on this manager.`);

		const parentPath = getParentPath(id);
		const parent = this._getById(parentPath);
		if (typeof parent === 'undefined') throw new Error('not found parent layer group.');

		parent._addLayer(layerConfig, extend(true, options, {
			onVisiblePath: this._onVisiblePath(parent),
			parentNextLayerId: this._getParentNextLayerId(parent)
		}));
	}

	removeLayer(id) {
		const lyr = this._getById(id);
		if (!(lyr instanceof Lyr)) throw new Error('This id is not layer.');

		const parent = lyr._parent;
		parent._removeLayer(lyr._id);
	}

	show(id, options = {}) {
		options = extend(true, {
			force: false
		}, options);
		const parentPath = getParentPath(id);
		const parent = this._getById(parentPath);

		if (parent) {
			parent._show(id, true, extend(true, options, {
				onVisiblePath: this._onVisiblePath(parent)
			}));
		}
	}

	hide(id, options = {}) {
		options = extend(true, {
			force: false
		}, options);
		const parentPath = getParentPath(id);
		const parent = this._getById(parentPath);

		if (parent) {
			parent._hide(id, true, options);
		}
	}

	move(id, beforeId) {
		const parentPath = getParentPath(id);
		const parent = this._getById(parentPath);
		if (id === beforeId)
			return;

		if (beforeId) {
			const beforeParentPath = beforeId.slice(0, beforeId.lastIndexOf(PATH_SEPARATOR) + 1);
			if (parentPath !== beforeParentPath) throw new Error('These ids are not same group.');
		}

		if ([parent._underlayId, parent._overlayId].indexOf(id) >= 0)
			throw new Error('can\'t update fixed layer.');
		if (parent._underlayId === beforeId)
			throw new Error('can\'t update fixed layer.');
		if (parent._overlayId !== '' && typeof beforeId === 'undefined')
			throw new Error('can\'t update fixed layer.');

		const lyr = parent._lyrs[getIndexByKey(parent._lyrs, '_id', id)];
		removeList(lyr, parent._lyrs);

		let index;
		if (beforeId) {
			const beforeIndex = getIndexByKey(parent._lyrs, '_id', beforeId);
			if (beforeIndex < 0) throw new Error('not found beforeId\'s layer.');
			index = beforeIndex;
		} else {
			index = parent._lyrs.length;
		}
		addList(lyr, parent._lyrs, index);
		const beforeLayerId = this._getParentNextLayerId(parent)

		const _move = (lyr, beforeLayerId) => {
			if (lyr instanceof LyrGrp) {
				lyr._lyrs.forEach((lyr) => {
					_move(lyr, beforeLayerId)
				})
			} else {
				this._map.moveLayer(lyr._id, beforeLayerId)
			}
		}
		_move(lyr, beforeLayerId)
	}

	addSource(id, source) {
		this._map.addSource(id, source)
	}

	invoke(methodName) {
		if (typeof this._map[methodName] === 'function') {
			return this._map[methodName](...[].slice.call(arguments).slice(1));
		}
	}

	setOpacity(id, opacity) {
		const lyr = this._getById(id);

		const _setOpacity = (lyr, opacity) => {
			if (lyr instanceof Lyr) {
				const propNames = getOpacityPropertyNames(lyr._type);

				propNames.forEach((propName) => {
					this._map.setPaintProperty(
						lyr._id,
						propName,
						opacity
					);
				})
			}
			if (lyr instanceof LyrGrp) {
				lyr._opacity = opacity;
				lyr._lyrs.forEach((child) => {
					_setOpacity(child, opacity);
				})
			}
		}
		_setOpacity(lyr, opacity);
	}

	getLayerIds(options = {}) {
		options = extend(true, {
			id: '',
			visiblity: 'any'
		}, options);
		const id = options.id;
		const visiblity = options.visiblity;
		const root = this._getById(id);

		if (root instanceof Lyr) return [root._id];

		const _getIds = (lyrs) => {
			let ids = []
			lyrs.forEach((lyr) => {
				if (lyr instanceof Lyr) {
					if (visiblity === 'any')
						ids.push(lyr._id);
					if (visiblity === 'visible' && this._map.getLayoutProperty(lyr._id, 'visibility') === 'visible') {
						ids.push(lyr._id);
					}
					if (visiblity === 'none' && this._map.getLayoutProperty(lyr._id, 'visibility') === 'none') {
						ids.push(lyr._id);
					}
				}
				if (lyr instanceof LyrGrp) {
					ids = ids.concat(_getIds(lyr._lyrs))
				}
			})

			return ids
		}
		return _getIds(root._lyrs);
	}
}

export default MapboxLayerManager