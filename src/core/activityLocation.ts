import polyline from '@mapbox/polyline';
import type {
  FeatureCollection,
  MultiPolygon,
  Polygon,
  Position,
} from 'geojson';

type LocatedActivity = {
  location_country: string | null;
  summary_polyline: string | null;
};

export interface ActivityLocation {
  country: string | null;
  province: string | null;
}

type Boundaries = FeatureCollection<Polygon | MultiPolygon>;
type Region = { name: string; rings: Position[][]; bounds: number[] };
const locations = new WeakMap<LocatedActivity, ActivityLocation>();
const provinces = [
  '北京市',
  '天津市',
  '上海市',
  '重庆市',
  '河北省',
  '山西省',
  '辽宁省',
  '吉林省',
  '黑龙江省',
  '江苏省',
  '浙江省',
  '安徽省',
  '福建省',
  '江西省',
  '山东省',
  '河南省',
  '湖北省',
  '湖南省',
  '广东省',
  '海南省',
  '四川省',
  '贵州省',
  '云南省',
  '陕西省',
  '甘肃省',
  '青海省',
  '内蒙古自治区',
  '广西壮族自治区',
  '西藏自治区',
  '宁夏回族自治区',
  '新疆维吾尔自治区',
  '香港特别行政区',
  '澳门特别行政区',
  '台湾省',
];
const countryAliases: Record<string, string> = {
  china: '中国',
  cn: '中国',
  chn: '中国',
  中华人民共和国: '中国',
  japan: '日本',
  jp: '日本',
  jpn: '日本',
  thailand: '泰国',
  th: '泰国',
  tha: '泰国',
  'united states': '美国',
  'united states of america': '美国',
  us: '美国',
  usa: '美国',
};

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return !trimmed || /^(none|null|undefined)$/i.test(trimmed) ? null : trimmed;
}

function normalizeCountry(country: string): string {
  return countryAliases[country.toLowerCase()] ?? country;
}

export function extractProvince(location: string | null): string | null {
  const value = text(location);
  if (!value) return null;
  if (value.startsWith('{')) {
    try {
      const data = JSON.parse(
        value.replace(/'/g, '"').replace(/\bNone\b/g, 'null')
      );
      const country = text(data?.country);
      if (country && normalizeCountry(country) !== '中国') return null;
      return extractProvince(text(data?.province) ?? text(data?.state));
    } catch {
      return null;
    }
  }
  for (const province of provinces) {
    if (value.includes(province)) return province;
  }
  for (const province of provinces) {
    const short = province.replace(
      /省$|市$|壮族自治区$|回族自治区$|维吾尔自治区$|自治区$|特别行政区$/,
      ''
    );
    if (value.includes(short)) return province;
  }
  return null;
}

function metadataLocation(location: string | null): ActivityLocation {
  const value = text(location);
  const province = extractProvince(value);
  if (!value) return { country: null, province: null };
  if (value.startsWith('{')) {
    try {
      const data = JSON.parse(
        value.replace(/'/g, '"').replace(/\bNone\b/g, 'null')
      );
      const country = text(data?.country);
      return {
        country: country ? normalizeCountry(country) : province ? '中国' : null,
        province,
      };
    } catch {
      return { country: null, province: null };
    }
  }
  if (province) return { country: '中国', province };
  const country = normalizeCountry(value);
  return {
    country: Object.values(countryAliases).includes(country) ? country : null,
    province: null,
  };
}

function indexRegions(data: Boundaries): Region[] {
  return data.features.flatMap((feature) => {
    const name = text(feature.properties?.name);
    if (!name || !feature.geometry) return [];
    const geometry = feature.geometry;
    const polygons =
      geometry.type === 'Polygon'
        ? [geometry.coordinates]
        : geometry.coordinates;
    return polygons.map((rings) => {
      const outer = rings[0] ?? [];
      const xs = outer.map((p) => p[0]);
      const ys = outer.map((p) => p[1]);
      return {
        name,
        rings,
        bounds: [
          Math.min(...xs),
          Math.min(...ys),
          Math.max(...xs),
          Math.max(...ys),
        ],
      };
    });
  });
}

function inRing([x, y]: Position, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const cross = (x - xi) * (yj - yi) - (y - yi) * (xj - xi);
    if (
      Math.abs(cross) < 1e-10 &&
      x >= Math.min(xi, xj) &&
      x <= Math.max(xi, xj) &&
      y >= Math.min(yi, yj) &&
      y <= Math.max(yi, yj)
    )
      return true;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

function regionAt(point: Position, regions: Region[]): string | null {
  const [x, y] = point;
  for (const region of regions) {
    const [minX, minY, maxX, maxY] = region.bounds;
    if (x < minX || x > maxX || y < minY || y > maxY) continue;
    if (
      inRing(point, region.rings[0]) &&
      !region.rings.slice(1).some((hole) => inRing(point, hole))
    )
      return region.name;
  }
  return null;
}

/** Offline only: use this activity's own route, never the map's display fallback. */
export function createActivityLocator(
  provinceData: Boundaries,
  countryData: Boundaries
) {
  const provinceRegions = indexRegions(provinceData);
  const countryRegions = indexRegions(countryData);
  return (activity: LocatedActivity): ActivityLocation => {
    const explicit = metadataLocation(activity.location_country);
    if (explicit.province || (explicit.country && explicit.country !== '中国'))
      return explicit;
    const route = activity.summary_polyline;
    if (!route || !/^[?-~]+$/.test(route)) return explicit;
    let points: [number, number][];
    try {
      points = polyline.decode(route);
      if (
        points.length < 2 ||
        polyline.encode(points) !== route ||
        points.some(
          ([lat, lng]) =>
            !Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            Math.abs(lat) > 90 ||
            Math.abs(lng) > 180
        )
      )
        return explicit;
    } catch {
      return explicit;
    }
    const [lat, lng] = points[0];
    if (lat === 0 && lng === 0) return explicit;
    const province = regionAt([lng, lat], provinceRegions);
    if (province) return { country: '中国', province };
    return {
      country: explicit.country ?? regionAt([lng, lat], countryRegions),
      province: null,
    };
  };
}

export function prepareActivityLocations(
  activities: LocatedActivity[],
  provinceData: Boundaries,
  countryData: Boundaries
): void {
  const locate = createActivityLocator(provinceData, countryData);
  for (const activity of activities) locations.set(activity, locate(activity));
}

/** Both profile totals and province filtering read the same prepared result. */
export function getActivityLocation(
  activity: LocatedActivity
): ActivityLocation {
  return locations.get(activity) ?? metadataLocation(activity.location_country);
}
