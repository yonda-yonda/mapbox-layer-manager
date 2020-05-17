# MapboxLayerManager
mapboxにおいてレイヤーの表示/非表示、重なり順、透明度を管理する

mapbox v1.9.1にて動作確認

[sample](https://yonda-yonda.github.io/mapbox-layer-manager/sample/index.html)

## 使い方
### 初期化
`new MapboxLayerManager(map, options)`

### argument
* `map` mapbox-glオブジェクト (required)
* `options` オプション

#### configuration of options
* `separator` パスの区切り文字、デフォルトは`/`

### example
```js
const map = new mapboxgl.Map({
	container: "map",
	center: [139.765, 35.65],
	zoom: 10,
	minZoom: 0,
	maxZoom: 18
});

const manager = new MapboxLayerManager(map);
```

### 追加(レイヤー)
`manager.addLayer(layer, options)`

レイヤーを追加する。

sourceを同時に追加する場合、同名IDでソースも登録される。

### argument
* `layer` mapbox-glのaddLayerの第一引数と同じ (required)
* `options` オプション

#### configuration of options
* `beforeId` 指定されたIDのレイヤーオブジェクトの直前に追加する。
* `fixedTo` 値(`overlay`or`underlay`)が指定された場合、最前面または最背面に固定する。
			
### example
```js
manager.addLayer({
	id: "pale",
	type: "raster",
	source: {
		type: "raster",
		tiles: [
			"https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png"
		],
		attribution: "<a href='http: //maps.gsi.go.jp/development/ichiran.html'>地理院タイル</a>",
		tileSize: 256,
		minzoom: 5,
		maxzoom: 18
	}",
	layout: {
		visibility: "visible"
	}
});
```

### 追加(ソース)
`manager.addSource(id, source)`

ソースを登録する。

### argument
* `id` sourceのID (required)
* `source` sourceの設定 (required)

### example
```js
manager.addSource("tile_pale", {
	type: "raster",
	tiles: [
		"https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png"
	],
	attribution: "<a href='http: //maps.gsi.go.jp/development/ichiran.html'>地理院タイル</a>",
	tileSize: 256,
	minzoom: 5,
	maxzoom: 18
});
```

### 追加(レイヤーグループ)
`manager.addGroup(group, options)`

レイヤーグループを追加する。

### argument
* `group` レイヤーグループの設定 (required)
* `options` オプション

#### configuration of group
* `id` レイヤーグループのID (required)
* `type` グループのタイプ デフォルトは`multi`
* `visible` グループの表示状態 デフォルトは`true`

#### configuration of options
* `beforeId` 指定されたIDのレイヤーオブジェクトの直前に追加する。
* `fixedTo` 値(`overlay`or`underlay`)が指定された場合、最前面または最背面に固定する。
			
### example
```js
manager.addGroup({
	id: "group1"
}, {
	beforeId: "pale"
});
```

### グループへ追加
#### addLayer
親となるグループを追加した上で、addLayerまたはaddGroupで`親のレイヤーグループID`+`区切り文字(/)`+`追加するレイヤーのID`をidに設定する。

#### addSource
親となるグループを追加した上で、`親のレイヤーグループID`+`区切り文字(/)`+`追加するソースのID`をidに設定する。

### example
```js
manager.addGroup({
	id: "group1"
});

manager.addLayer({
	id: "group1/pale",
	type: "raster",
	source: {
		type: "raster",
		tiles: [
			"https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png"
		],
		attribution: "<a href='http: //maps.gsi.go.jp/development/ichiran.html'>地理院タイル</a>",
		tileSize: 256,
		minzoom: 5,
		maxzoom: 18
	}",
	layout: {
		"visibility": "visible"
	}
});

manager.addGroup({
	id: "group1/group1"
});

manager.addSource('group1/shape', {
	type: 'geojson',
	data: '../shape.geojson'
});

```
### シングルグループ
直下のレイヤーオブジェクトのうち、表示状態にできるのは1つのみのグループ。

showで選択レイヤーオブジェクトが切り替わる。

レイヤーオブジェクトを表示ステータスで追加した場合も、グループ内の選択レイヤーオブジェクトが切り替わる。


### example
```js
manager.addGroup({
	id: "group1"
}, {
	type: "single"
});
```


### 削除(レイヤー)
`manager.removeLayer(id, options)`

指定したレイヤーを削除する。

### argument
* `id` 削除したいレイヤーID (required)
* `options` オプション

#### configuration of options
* `withSource` 同名IDのソースも同時に削除するか デフォルトは`true`

### example
```js
manager.removeLayer("tile_pale");
```

### 削除(ソース)
`manager.removeSource(id)`

登録したソースを削除する。

### argument
* `id` sourceのID (required)

### example
```js
manager.removeSource("tile_pale");
```

### 削除(レイヤーグループ)
`manager.removeGroup(id)`

指定したレイヤーグループを削除する。このとき配下のレイヤーオブジェクトもすべて削除される。

### argument
* `id` 削除したいレイヤーID (required)
* `options` オプション

#### configuration of options
* `withSource` 配下のソースも同時に削除するか デフォルトは`true`

### example
```js
manager.removeGroup("group1");
```

### リセット
`manager.reset(options)`

全て削除する。

### argument
* `options` オプション

#### configuration of options
* `id:` 指定した要素の配下を全て削除する。 未指定の場合はmanager配下を全て削除する。


### example
```js
manager.reset();
```


### 表示
`manager.show(id, options)`

指定したレイヤーオブジェクトを表示状態にする。
祖先に表示ステータス(visible)がfalseのグループが1つでもある場合、自身の表示ステータスのみ変更される。
またレイヤーグループの場合、配下で表示ステータス(visible)がtrueのレイヤーオブジェクトを表示状態にする。

### argument
* `id` 表示したいレイヤーオブジェクトID (required)
* `options` オプション

#### configuration of options
* `force:` 配下の要素の表示ステータス(visible)を強制的に書き換える。 デフォルトは`false`

### example
```js
manager.show("group1");
```

### 非表示
`manager.hide(id, options)`

指定したレイヤーオブジェクトと配下のレイヤーオブジェクトを非表示状態にする。

### argument
* `id` 表示したいレイヤーオブジェクトID (required)
* `options` オプション

#### configuration of options
* `force:` 配下の要素の表示ステータス(visible)を強制的に書き換える。 デフォルトは`false`

### example
```js
manager.hide("group1");
```

### 移動
`manager.move(id, beforeId)`

レイヤーオブジェクトの位置を移動する。

指定したIDが最前面または最背面のレイヤーオブジェクトだった場合エラーとなる。

### argument
* `id` 移動したいレイヤーID (required)
* `beforeId` 移動先レイヤーID (required)

### example
```js
manager.move("group1", "tile_pale");
```

### 不透明度
`manager.setOpacity(id, opacity)`

レイヤーの不透明度を設定する。

レイヤーグループの場合、配下のレイヤーすべてに値を設定する。

### argument
* `id` 移動したいレイヤーID (required)
* `opacity` 透過度 (required)

### example
```js
manager.setOpacity("group1", 0.8);
```

### 表示状態の確認
`manager.isVisible(id, options)`

指定したレイヤーオブジェクトの表示状態を確認にする。

### argument
* `options` オプション

#### configuration of options
* `ownStatus:` 祖先に表示ステータス(visible)に関わらず自身の表示ステータスのみ参照する。 デフォルトは`false`

### example
```js
manager.isVisible("group1");
```


### Layerへのイベント関連付け
`manager.on(type, id, listener)`

`manager.off(type, id, listener)`

on/offのwrapper

現状ラスターレイヤーへの関連付けはできない。

### mapのメソッド呼び出し
`manager.invoke(funcName, args..)`

内部のmapbox-glオブジェクトのメソッドを実行する。

### argument
* `funcName` 呼び出すメソッド名 (required)

### example
```js
manager.invoke("getLayoutProperty", "someId", "visibility")
```