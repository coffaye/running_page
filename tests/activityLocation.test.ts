import assert from 'node:assert/strict';
import test from 'node:test';
import polyline from '@mapbox/polyline';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import china from '../src/assets/china-provinces.json' with { type: 'json' };
import world from '../src/static/world.zh.json' with { type: 'json' };
import activities from '../src/static/activities.json' with { type: 'json' };
import {
  createActivityLocator,
  extractProvince,
  getActivityLocation,
  prepareActivityLocations,
} from '../src/core/activityLocation.ts';

type Boundaries = FeatureCollection<Polygon | MultiPolygon>;
const provinceData = china as Boundaries;
const countryData = world as Boundaries;
const locate = createActivityLocator(provinceData, countryData);
const activity = (
  location: string | null = null,
  points?: [number, number][]
) => ({
  location_country: location,
  summary_polyline: points ? polyline.encode(points) : null,
});

test('missing COROS labels resolve offline from this activity route', () => {
  assert.deepEqual(
    locate(
      activity(null, [
        [29.56, 106.55],
        [29.561, 106.551],
      ])
    ),
    {
      country: '中国',
      province: '重庆市',
    }
  );
});

test('multiple provinces and foreign countries are distinguished', () => {
  assert.deepEqual(
    locate(
      activity(null, [
        [31.23, 121.47],
        [31.231, 121.471],
      ])
    ),
    {
      country: '中国',
      province: '上海市',
    }
  );
  assert.deepEqual(
    locate(
      activity(null, [
        [48.85, 2.35],
        [48.851, 2.351],
      ])
    ),
    {
      country: '法国',
      province: null,
    }
  );
});

test('location labels and Python/JSON metadata remain supported', () => {
  assert.equal(extractProvince('浙江 杭州'), '浙江省');
  assert.equal(
    extractProvince("{'country':'China','province':'重庆','city':None}"),
    '重庆市'
  );
  assert.deepEqual(locate(activity('{"country":"中国","province":"江苏省"}')), {
    country: '中国',
    province: '江苏省',
  });
  assert.deepEqual(
    locate(activity('{"country":"Japan","province":"東京都"}')),
    {
      country: '日本',
      province: null,
    }
  );
  assert.equal(extractProvince('{"country":"日本","province":"上海市"}'), null);
});

test('known metadata takes precedence over route-derived place labels', () => {
  assert.deepEqual(
    locate(
      activity('北京市', [
        [31.23, 121.47],
        [31.231, 121.471],
      ])
    ),
    {
      country: '中国',
      province: '北京市',
    }
  );
});

test('country-only metadata is enriched with the missing province', () => {
  assert.deepEqual(
    locate(
      activity('China', [
        [29.56, 106.55],
        [29.561, 106.551],
      ])
    ),
    {
      country: '中国',
      province: '重庆市',
    }
  );
});

test('indoor, absent, malformed and invalid routes remain unknown', () => {
  const unknown = { country: null, province: null };
  for (const label of [null, '', 'None', 'null', '  '])
    assert.deepEqual(locate(activity(label)), unknown);
  for (const route of ['abc', 'not a route', '?', '!!!']) {
    assert.deepEqual(
      locate({ location_country: null, summary_polyline: route }),
      unknown
    );
  }
  assert.deepEqual(
    locate(
      activity(null, [
        [100, 100],
        [100.1, 100.1],
      ])
    ),
    unknown
  );
  assert.deepEqual(
    locate(
      activity(null, [
        [0, 0],
        [0, 0],
      ])
    ),
    unknown
  );
  assert.deepEqual(
    locate(
      activity(null, [
        [0, -140],
        [0.001, -140.001],
      ])
    ),
    unknown
  );
});

test('a missing route never borrows the previous activity display fallback', () => {
  const outdoor = activity(null, [
    [29.56, 106.55],
    [29.561, 106.551],
  ]);
  const indoor = activity();
  prepareActivityLocations([outdoor, indoor], provinceData, countryData);
  assert.equal(getActivityLocation(outdoor).province, '重庆市');
  assert.deepEqual(getActivityLocation(indoor), {
    country: null,
    province: null,
  });
});

test('polygon holes, separate islands and unnamed map decorations are respected', () => {
  const data: Boundaries = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: '' },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [40, 0],
              [40, 40],
              [0, 40],
              [0, 0],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: { name: 'Test country' },
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [1, 1],
                [10, 1],
                [10, 10],
                [1, 10],
                [1, 1],
              ],
              [
                [3, 3],
                [7, 3],
                [7, 7],
                [3, 7],
                [3, 3],
              ],
            ],
            [
              [
                [20, 20],
                [25, 20],
                [25, 25],
                [20, 25],
                [20, 20],
              ],
            ],
          ],
        },
      },
    ],
  };
  const resolver = createActivityLocator(
    { type: 'FeatureCollection', features: [] },
    data
  );
  assert.equal(
    resolver(
      activity(null, [
        [2, 2],
        [2.01, 2.01],
      ])
    ).country,
    'Test country'
  );
  assert.equal(
    resolver(
      activity(null, [
        [5, 5],
        [5.01, 5.01],
      ])
    ).country,
    null
  );
  assert.equal(
    resolver(
      activity(null, [
        [22, 22],
        [22.01, 22.01],
      ])
    ).country,
    'Test country'
  );
  assert.equal(
    resolver(
      activity(null, [
        [15, 15],
        [15.01, 15.01],
      ])
    ).country,
    null
  );
});

test('current activity data yields matching nonzero profile and map counts without mutation', () => {
  const before = JSON.stringify(activities);
  prepareActivityLocations(activities, provinceData, countryData);
  const resolved = activities.map(getActivityLocation);
  const countries = new Set(
    resolved.map((location) => location.country).filter(Boolean)
  );
  const profileProvinces = new Set(
    resolved.map((location) => location.province).filter(Boolean)
  );
  const mapCounts = new Map<string, number>();
  for (const row of activities) {
    const province = getActivityLocation(row).province;
    if (province) mapCounts.set(province, (mapCounts.get(province) ?? 0) + 1);
  }
  assert.ok(countries.size > 0);
  assert.ok(profileProvinces.size > 0);
  assert.deepEqual(new Set(mapCounts.keys()), profileProvinces);
  assert.equal(
    new Set(
      china.features.map((feature) => feature.properties.name).filter(Boolean)
    ).size,
    34
  );
  assert.equal(JSON.stringify(activities), before);
});
