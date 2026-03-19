import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CityEntry = {
  city: string;
  county: string | null;
  state: string;
  state_code: string;
  zip_code: string | null;
  latitude: number;
  longitude: number;
  population: number;
  timezone: string;
  region: string;
  country: string;
  country_code: string;
};

// ─── United States ───
const US_CITIES: CityEntry[] = [
  { city: "New York", county: "New York", state: "New York", state_code: "NY", zip_code: "10001", latitude: 40.7128, longitude: -74.006, population: 8336817, timezone: "America/New_York", region: "Northeast", country: "United States", country_code: "US" },
  { city: "Los Angeles", county: "Los Angeles", state: "California", state_code: "CA", zip_code: "90012", latitude: 34.0522, longitude: -118.2437, population: 3898747, timezone: "America/Los_Angeles", region: "West", country: "United States", country_code: "US" },
  { city: "Chicago", county: "Cook", state: "Illinois", state_code: "IL", zip_code: "60601", latitude: 41.8781, longitude: -87.6298, population: 2693976, timezone: "America/Chicago", region: "Midwest", country: "United States", country_code: "US" },
  { city: "Houston", county: "Harris", state: "Texas", state_code: "TX", zip_code: "77002", latitude: 29.7604, longitude: -95.3698, population: 2304580, timezone: "America/Chicago", region: "Southwest", country: "United States", country_code: "US" },
  { city: "Phoenix", county: "Maricopa", state: "Arizona", state_code: "AZ", zip_code: "85004", latitude: 33.4484, longitude: -112.074, population: 1608139, timezone: "America/Phoenix", region: "Southwest", country: "United States", country_code: "US" },
  { city: "Philadelphia", county: "Philadelphia", state: "Pennsylvania", state_code: "PA", zip_code: "19103", latitude: 39.9526, longitude: -75.1652, population: 1603797, timezone: "America/New_York", region: "Northeast", country: "United States", country_code: "US" },
  { city: "San Antonio", county: "Bexar", state: "Texas", state_code: "TX", zip_code: "78205", latitude: 29.4241, longitude: -98.4936, population: 1547253, timezone: "America/Chicago", region: "Southwest", country: "United States", country_code: "US" },
  { city: "San Diego", county: "San Diego", state: "California", state_code: "CA", zip_code: "92101", latitude: 32.7157, longitude: -117.1611, population: 1386932, timezone: "America/Los_Angeles", region: "West", country: "United States", country_code: "US" },
  { city: "Dallas", county: "Dallas", state: "Texas", state_code: "TX", zip_code: "75201", latitude: 32.7767, longitude: -96.797, population: 1304379, timezone: "America/Chicago", region: "Southwest", country: "United States", country_code: "US" },
  { city: "San Jose", county: "Santa Clara", state: "California", state_code: "CA", zip_code: "95113", latitude: 37.3382, longitude: -121.8863, population: 1013240, timezone: "America/Los_Angeles", region: "West", country: "United States", country_code: "US" },
  { city: "Austin", county: "Travis", state: "Texas", state_code: "TX", zip_code: "78701", latitude: 30.2672, longitude: -97.7431, population: 978908, timezone: "America/Chicago", region: "Southwest", country: "United States", country_code: "US" },
  { city: "Jacksonville", county: "Duval", state: "Florida", state_code: "FL", zip_code: "32202", latitude: 30.3322, longitude: -81.6557, population: 949611, timezone: "America/New_York", region: "Southeast", country: "United States", country_code: "US" },
  { city: "San Francisco", county: "San Francisco", state: "California", state_code: "CA", zip_code: "94102", latitude: 37.7749, longitude: -122.4194, population: 873965, timezone: "America/Los_Angeles", region: "West", country: "United States", country_code: "US" },
  { city: "Indianapolis", county: "Marion", state: "Indiana", state_code: "IN", zip_code: "46204", latitude: 39.7684, longitude: -86.1581, population: 887642, timezone: "America/Indiana/Indianapolis", region: "Midwest", country: "United States", country_code: "US" },
  { city: "Columbus", county: "Franklin", state: "Ohio", state_code: "OH", zip_code: "43215", latitude: 39.9612, longitude: -82.9988, population: 905748, timezone: "America/New_York", region: "Midwest", country: "United States", country_code: "US" },
  { city: "Charlotte", county: "Mecklenburg", state: "North Carolina", state_code: "NC", zip_code: "28202", latitude: 35.2271, longitude: -80.8431, population: 874579, timezone: "America/New_York", region: "Southeast", country: "United States", country_code: "US" },
  { city: "Seattle", county: "King", state: "Washington", state_code: "WA", zip_code: "98101", latitude: 47.6062, longitude: -122.3321, population: 737015, timezone: "America/Los_Angeles", region: "West", country: "United States", country_code: "US" },
  { city: "Denver", county: "Denver", state: "Colorado", state_code: "CO", zip_code: "80202", latitude: 39.7392, longitude: -104.9903, population: 715522, timezone: "America/Denver", region: "West", country: "United States", country_code: "US" },
  { city: "Washington", county: "District of Columbia", state: "District of Columbia", state_code: "DC", zip_code: "20001", latitude: 38.9072, longitude: -77.0369, population: 689545, timezone: "America/New_York", region: "Northeast", country: "United States", country_code: "US" },
  { city: "Nashville", county: "Davidson", state: "Tennessee", state_code: "TN", zip_code: "37201", latitude: 36.1627, longitude: -86.7816, population: 689447, timezone: "America/Chicago", region: "Southeast", country: "United States", country_code: "US" },
  { city: "Boston", county: "Suffolk", state: "Massachusetts", state_code: "MA", zip_code: "02108", latitude: 42.3601, longitude: -71.0589, population: 675647, timezone: "America/New_York", region: "Northeast", country: "United States", country_code: "US" },
  { city: "Detroit", county: "Wayne", state: "Michigan", state_code: "MI", zip_code: "48226", latitude: 42.3314, longitude: -83.0458, population: 639111, timezone: "America/Detroit", region: "Midwest", country: "United States", country_code: "US" },
  { city: "Memphis", county: "Shelby", state: "Tennessee", state_code: "TN", zip_code: "38103", latitude: 35.1495, longitude: -90.049, population: 633104, timezone: "America/Chicago", region: "Southeast", country: "United States", country_code: "US" },
  { city: "Louisville", county: "Jefferson", state: "Kentucky", state_code: "KY", zip_code: "40202", latitude: 38.2527, longitude: -85.7585, population: 633045, timezone: "America/Kentucky/Louisville", region: "Southeast", country: "United States", country_code: "US" },
  { city: "Portland", county: "Multnomah", state: "Oregon", state_code: "OR", zip_code: "97201", latitude: 45.5152, longitude: -122.6784, population: 652503, timezone: "America/Los_Angeles", region: "West", country: "United States", country_code: "US" },
  { city: "Baltimore", county: "Baltimore City", state: "Maryland", state_code: "MD", zip_code: "21202", latitude: 39.2904, longitude: -76.6122, population: 585708, timezone: "America/New_York", region: "Northeast", country: "United States", country_code: "US" },
  { city: "Milwaukee", county: "Milwaukee", state: "Wisconsin", state_code: "WI", zip_code: "53202", latitude: 43.0389, longitude: -87.9065, population: 577222, timezone: "America/Chicago", region: "Midwest", country: "United States", country_code: "US" },
  { city: "Albuquerque", county: "Bernalillo", state: "New Mexico", state_code: "NM", zip_code: "87102", latitude: 35.0844, longitude: -106.6504, population: 564559, timezone: "America/Denver", region: "Southwest", country: "United States", country_code: "US" },
  { city: "Tucson", county: "Pima", state: "Arizona", state_code: "AZ", zip_code: "85701", latitude: 32.2226, longitude: -110.9747, population: 542629, timezone: "America/Phoenix", region: "Southwest", country: "United States", country_code: "US" },
  { city: "Fresno", county: "Fresno", state: "California", state_code: "CA", zip_code: "93721", latitude: 36.7378, longitude: -119.7871, population: 542107, timezone: "America/Los_Angeles", region: "West", country: "United States", country_code: "US" },
  { city: "Sacramento", county: "Sacramento", state: "California", state_code: "CA", zip_code: "95814", latitude: 38.5816, longitude: -121.4944, population: 524943, timezone: "America/Los_Angeles", region: "West", country: "United States", country_code: "US" },
  { city: "Mesa", county: "Maricopa", state: "Arizona", state_code: "AZ", zip_code: "85201", latitude: 33.4152, longitude: -111.8315, population: 504258, timezone: "America/Phoenix", region: "Southwest", country: "United States", country_code: "US" },
  { city: "Kansas City", county: "Jackson", state: "Missouri", state_code: "MO", zip_code: "64106", latitude: 39.0997, longitude: -94.5786, population: 508090, timezone: "America/Chicago", region: "Midwest", country: "United States", country_code: "US" },
  { city: "Atlanta", county: "Fulton", state: "Georgia", state_code: "GA", zip_code: "30303", latitude: 33.749, longitude: -84.388, population: 498715, timezone: "America/New_York", region: "Southeast", country: "United States", country_code: "US" },
  { city: "Omaha", county: "Douglas", state: "Nebraska", state_code: "NE", zip_code: "68102", latitude: 41.2565, longitude: -95.9345, population: 486051, timezone: "America/Chicago", region: "Midwest", country: "United States", country_code: "US" },
  { city: "Colorado Springs", county: "El Paso", state: "Colorado", state_code: "CO", zip_code: "80903", latitude: 38.8339, longitude: -104.8214, population: 478961, timezone: "America/Denver", region: "West", country: "United States", country_code: "US" },
  { city: "Raleigh", county: "Wake", state: "North Carolina", state_code: "NC", zip_code: "27601", latitude: 35.7796, longitude: -78.6382, population: 467665, timezone: "America/New_York", region: "Southeast", country: "United States", country_code: "US" },
  { city: "Long Beach", county: "Los Angeles", state: "California", state_code: "CA", zip_code: "90802", latitude: 33.7701, longitude: -118.1937, population: 466742, timezone: "America/Los_Angeles", region: "West", country: "United States", country_code: "US" },
  { city: "Virginia Beach", county: "Virginia Beach", state: "Virginia", state_code: "VA", zip_code: "23451", latitude: 36.8529, longitude: -75.978, population: 459470, timezone: "America/New_York", region: "Southeast", country: "United States", country_code: "US" },
  { city: "Miami", county: "Miami-Dade", state: "Florida", state_code: "FL", zip_code: "33130", latitude: 25.7617, longitude: -80.1918, population: 442241, timezone: "America/New_York", region: "Southeast", country: "United States", country_code: "US" },
  { city: "Oakland", county: "Alameda", state: "California", state_code: "CA", zip_code: "94612", latitude: 37.8044, longitude: -122.2712, population: 433031, timezone: "America/Los_Angeles", region: "West", country: "United States", country_code: "US" },
  { city: "Minneapolis", county: "Hennepin", state: "Minnesota", state_code: "MN", zip_code: "55401", latitude: 44.9778, longitude: -93.265, population: 429954, timezone: "America/Chicago", region: "Midwest", country: "United States", country_code: "US" },
  { city: "Tampa", county: "Hillsborough", state: "Florida", state_code: "FL", zip_code: "33602", latitude: 27.9506, longitude: -82.4572, population: 384959, timezone: "America/New_York", region: "Southeast", country: "United States", country_code: "US" },
  { city: "New Orleans", county: "Orleans", state: "Louisiana", state_code: "LA", zip_code: "70112", latitude: 29.9511, longitude: -90.0715, population: 383997, timezone: "America/Chicago", region: "Southeast", country: "United States", country_code: "US" },
  { city: "Wichita", county: "Sedgwick", state: "Kansas", state_code: "KS", zip_code: "67202", latitude: 37.6872, longitude: -97.3301, population: 397532, timezone: "America/Chicago", region: "Midwest", country: "United States", country_code: "US" },
  { city: "Cleveland", county: "Cuyahoga", state: "Ohio", state_code: "OH", zip_code: "44113", latitude: 41.4993, longitude: -81.6944, population: 372624, timezone: "America/New_York", region: "Midwest", country: "United States", country_code: "US" },
  { city: "Honolulu", county: "Honolulu", state: "Hawaii", state_code: "HI", zip_code: "96813", latitude: 21.3069, longitude: -157.8583, population: 350964, timezone: "Pacific/Honolulu", region: "West", country: "United States", country_code: "US" },
  { city: "Orlando", county: "Orange", state: "Florida", state_code: "FL", zip_code: "32801", latitude: 28.5383, longitude: -81.3792, population: 307573, timezone: "America/New_York", region: "Southeast", country: "United States", country_code: "US" },
  { city: "Pittsburgh", county: "Allegheny", state: "Pennsylvania", state_code: "PA", zip_code: "15222", latitude: 40.4406, longitude: -79.9959, population: 302971, timezone: "America/New_York", region: "Northeast", country: "United States", country_code: "US" },
  { city: "Salt Lake City", county: "Salt Lake", state: "Utah", state_code: "UT", zip_code: "84101", latitude: 40.7608, longitude: -111.891, population: 199723, timezone: "America/Denver", region: "West", country: "United States", country_code: "US" },
  { city: "Las Vegas", county: "Clark", state: "Nevada", state_code: "NV", zip_code: "89101", latitude: 36.1699, longitude: -115.1398, population: 641903, timezone: "America/Los_Angeles", region: "West", country: "United States", country_code: "US" },
  { city: "Birmingham", county: "Jefferson", state: "Alabama", state_code: "AL", zip_code: "35203", latitude: 33.5207, longitude: -86.8025, population: 200733, timezone: "America/Chicago", region: "Southeast", country: "United States", country_code: "US" },
  { city: "Anchorage", county: "Anchorage", state: "Alaska", state_code: "AK", zip_code: "99501", latitude: 61.2181, longitude: -149.9003, population: 291247, timezone: "America/Anchorage", region: "West", country: "United States", country_code: "US" },
  { city: "Boise", county: "Ada", state: "Idaho", state_code: "ID", zip_code: "83702", latitude: 43.615, longitude: -116.2023, population: 235684, timezone: "America/Boise", region: "West", country: "United States", country_code: "US" },
  { city: "Des Moines", county: "Polk", state: "Iowa", state_code: "IA", zip_code: "50309", latitude: 41.5868, longitude: -93.625, population: 214133, timezone: "America/Chicago", region: "Midwest", country: "United States", country_code: "US" },
  { city: "Little Rock", county: "Pulaski", state: "Arkansas", state_code: "AR", zip_code: "72201", latitude: 34.7465, longitude: -92.2896, population: 202591, timezone: "America/Chicago", region: "Southeast", country: "United States", country_code: "US" },
  { city: "Lexington", county: "Fayette", state: "Kentucky", state_code: "KY", zip_code: "40507", latitude: 38.0406, longitude: -84.5037, population: 322570, timezone: "America/Kentucky/Louisville", region: "Southeast", country: "United States", country_code: "US" },
  { city: "St. Paul", county: "Ramsey", state: "Minnesota", state_code: "MN", zip_code: "55101", latitude: 44.9537, longitude: -93.089, population: 311527, timezone: "America/Chicago", region: "Midwest", country: "United States", country_code: "US" },
  { city: "Richmond", county: "Richmond City", state: "Virginia", state_code: "VA", zip_code: "23219", latitude: 37.5407, longitude: -77.436, population: 226610, timezone: "America/New_York", region: "Southeast", country: "United States", country_code: "US" },
  { city: "Bakersfield", county: "Kern", state: "California", state_code: "CA", zip_code: "93301", latitude: 35.3733, longitude: -119.0187, population: 403455, timezone: "America/Los_Angeles", region: "West", country: "United States", country_code: "US" },
];

// ─── United Kingdom ───
const UK_CITIES: CityEntry[] = [
  { city: "London", county: null, state: "England", state_code: "ENG", zip_code: "EC1A 1BB", latitude: 51.5074, longitude: -0.1278, population: 8982000, timezone: "Europe/London", region: "South East", country: "United Kingdom", country_code: "GB" },
  { city: "Birmingham", county: "West Midlands", state: "England", state_code: "ENG", zip_code: "B1 1BB", latitude: 52.4862, longitude: -1.8904, population: 1141816, timezone: "Europe/London", region: "West Midlands", country: "United Kingdom", country_code: "GB" },
  { city: "Manchester", county: "Greater Manchester", state: "England", state_code: "ENG", zip_code: "M1 1AE", latitude: 53.4808, longitude: -2.2426, population: 547627, timezone: "Europe/London", region: "North West", country: "United Kingdom", country_code: "GB" },
  { city: "Leeds", county: "West Yorkshire", state: "England", state_code: "ENG", zip_code: "LS1 1BA", latitude: 53.8008, longitude: -1.5491, population: 789194, timezone: "Europe/London", region: "Yorkshire", country: "United Kingdom", country_code: "GB" },
  { city: "Glasgow", county: null, state: "Scotland", state_code: "SCT", zip_code: "G1 1AA", latitude: 55.8642, longitude: -4.2518, population: 633120, timezone: "Europe/London", region: "Scotland", country: "United Kingdom", country_code: "GB" },
  { city: "Liverpool", county: "Merseyside", state: "England", state_code: "ENG", zip_code: "L1 1JD", latitude: 53.4084, longitude: -2.9916, population: 496784, timezone: "Europe/London", region: "North West", country: "United Kingdom", country_code: "GB" },
  { city: "Bristol", county: null, state: "England", state_code: "ENG", zip_code: "BS1 1AA", latitude: 51.4545, longitude: -2.5879, population: 463400, timezone: "Europe/London", region: "South West", country: "United Kingdom", country_code: "GB" },
  { city: "Edinburgh", county: null, state: "Scotland", state_code: "SCT", zip_code: "EH1 1RE", latitude: 55.9533, longitude: -3.1883, population: 524930, timezone: "Europe/London", region: "Scotland", country: "United Kingdom", country_code: "GB" },
  { city: "Sheffield", county: "South Yorkshire", state: "England", state_code: "ENG", zip_code: "S1 1AA", latitude: 53.3811, longitude: -1.4701, population: 584853, timezone: "Europe/London", region: "Yorkshire", country: "United Kingdom", country_code: "GB" },
  { city: "Newcastle", county: "Tyne and Wear", state: "England", state_code: "ENG", zip_code: "NE1 1AA", latitude: 54.9783, longitude: -1.6178, population: 302820, timezone: "Europe/London", region: "North East", country: "United Kingdom", country_code: "GB" },
  { city: "Nottingham", county: "Nottinghamshire", state: "England", state_code: "ENG", zip_code: "NG1 1AA", latitude: 52.9548, longitude: -1.1581, population: 321500, timezone: "Europe/London", region: "East Midlands", country: "United Kingdom", country_code: "GB" },
  { city: "Cardiff", county: null, state: "Wales", state_code: "WLS", zip_code: "CF10 1AA", latitude: 51.4816, longitude: -3.1791, population: 362400, timezone: "Europe/London", region: "Wales", country: "United Kingdom", country_code: "GB" },
  { city: "Belfast", county: null, state: "Northern Ireland", state_code: "NIR", zip_code: "BT1 1AA", latitude: 54.5973, longitude: -5.9301, population: 343542, timezone: "Europe/London", region: "Northern Ireland", country: "United Kingdom", country_code: "GB" },
  { city: "Leicester", county: "Leicestershire", state: "England", state_code: "ENG", zip_code: "LE1 1AA", latitude: 52.6369, longitude: -1.1398, population: 354224, timezone: "Europe/London", region: "East Midlands", country: "United Kingdom", country_code: "GB" },
  { city: "Southampton", county: "Hampshire", state: "England", state_code: "ENG", zip_code: "SO14 1AA", latitude: 50.9097, longitude: -1.4044, population: 252796, timezone: "Europe/London", region: "South East", country: "United Kingdom", country_code: "GB" },
  { city: "Brighton", county: "East Sussex", state: "England", state_code: "ENG", zip_code: "BN1 1AA", latitude: 50.8225, longitude: -0.1372, population: 229700, timezone: "Europe/London", region: "South East", country: "United Kingdom", country_code: "GB" },
  { city: "Plymouth", county: "Devon", state: "England", state_code: "ENG", zip_code: "PL1 1AA", latitude: 50.3755, longitude: -4.1427, population: 262100, timezone: "Europe/London", region: "South West", country: "United Kingdom", country_code: "GB" },
  { city: "Aberdeen", county: null, state: "Scotland", state_code: "SCT", zip_code: "AB10 1AA", latitude: 57.1497, longitude: -2.0943, population: 196670, timezone: "Europe/London", region: "Scotland", country: "United Kingdom", country_code: "GB" },
  { city: "Coventry", county: "West Midlands", state: "England", state_code: "ENG", zip_code: "CV1 1AA", latitude: 52.4068, longitude: -1.5197, population: 371521, timezone: "Europe/London", region: "West Midlands", country: "United Kingdom", country_code: "GB" },
  { city: "Derby", county: "Derbyshire", state: "England", state_code: "ENG", zip_code: "DE1 1AA", latitude: 52.9225, longitude: -1.4746, population: 257174, timezone: "Europe/London", region: "East Midlands", country: "United Kingdom", country_code: "GB" },
];

// ─── Canada ───
const CA_CITIES: CityEntry[] = [
  { city: "Toronto", county: null, state: "Ontario", state_code: "ON", zip_code: "M5H 2N2", latitude: 43.6532, longitude: -79.3832, population: 2731571, timezone: "America/Toronto", region: "Central", country: "Canada", country_code: "CA" },
  { city: "Montreal", county: null, state: "Quebec", state_code: "QC", zip_code: "H2X 1Y4", latitude: 45.5017, longitude: -73.5673, population: 1762949, timezone: "America/Montreal", region: "Eastern", country: "Canada", country_code: "CA" },
  { city: "Vancouver", county: null, state: "British Columbia", state_code: "BC", zip_code: "V6B 1A1", latitude: 49.2827, longitude: -123.1207, population: 631486, timezone: "America/Vancouver", region: "Western", country: "Canada", country_code: "CA" },
  { city: "Calgary", county: null, state: "Alberta", state_code: "AB", zip_code: "T2P 0A1", latitude: 51.0447, longitude: -114.0719, population: 1239220, timezone: "America/Edmonton", region: "Western", country: "Canada", country_code: "CA" },
  { city: "Edmonton", county: null, state: "Alberta", state_code: "AB", zip_code: "T5J 0N3", latitude: 53.5461, longitude: -113.4938, population: 981280, timezone: "America/Edmonton", region: "Western", country: "Canada", country_code: "CA" },
  { city: "Ottawa", county: null, state: "Ontario", state_code: "ON", zip_code: "K1A 0A9", latitude: 45.4215, longitude: -75.6972, population: 934243, timezone: "America/Toronto", region: "Central", country: "Canada", country_code: "CA" },
  { city: "Winnipeg", county: null, state: "Manitoba", state_code: "MB", zip_code: "R3C 0A1", latitude: 49.8951, longitude: -97.1384, population: 749534, timezone: "America/Winnipeg", region: "Central", country: "Canada", country_code: "CA" },
  { city: "Quebec City", county: null, state: "Quebec", state_code: "QC", zip_code: "G1R 1A1", latitude: 46.8139, longitude: -71.2080, population: 542298, timezone: "America/Montreal", region: "Eastern", country: "Canada", country_code: "CA" },
  { city: "Hamilton", county: null, state: "Ontario", state_code: "ON", zip_code: "L8P 1A1", latitude: 43.2557, longitude: -79.8711, population: 536917, timezone: "America/Toronto", region: "Central", country: "Canada", country_code: "CA" },
  { city: "Halifax", county: null, state: "Nova Scotia", state_code: "NS", zip_code: "B3J 1A1", latitude: 44.6488, longitude: -63.5752, population: 403131, timezone: "America/Halifax", region: "Eastern", country: "Canada", country_code: "CA" },
  { city: "Victoria", county: null, state: "British Columbia", state_code: "BC", zip_code: "V8W 1A1", latitude: 48.4284, longitude: -123.3656, population: 91867, timezone: "America/Vancouver", region: "Western", country: "Canada", country_code: "CA" },
  { city: "Saskatoon", county: null, state: "Saskatchewan", state_code: "SK", zip_code: "S7K 0A1", latitude: 52.1332, longitude: -106.6700, population: 266141, timezone: "America/Regina", region: "Central", country: "Canada", country_code: "CA" },
  { city: "Regina", county: null, state: "Saskatchewan", state_code: "SK", zip_code: "S4P 0A1", latitude: 50.4452, longitude: -104.6189, population: 215106, timezone: "America/Regina", region: "Central", country: "Canada", country_code: "CA" },
  { city: "St. John's", county: null, state: "Newfoundland", state_code: "NL", zip_code: "A1C 1A1", latitude: 47.5615, longitude: -52.7126, population: 110525, timezone: "America/St_Johns", region: "Eastern", country: "Canada", country_code: "CA" },
  { city: "London", county: null, state: "Ontario", state_code: "ON", zip_code: "N6A 1A1", latitude: 42.9849, longitude: -81.2453, population: 383822, timezone: "America/Toronto", region: "Central", country: "Canada", country_code: "CA" },
];

// ─── France ───
const FR_CITIES: CityEntry[] = [
  { city: "Paris", county: null, state: "Île-de-France", state_code: "IDF", zip_code: "75001", latitude: 48.8566, longitude: 2.3522, population: 2161000, timezone: "Europe/Paris", region: "Île-de-France", country: "France", country_code: "FR" },
  { city: "Marseille", county: null, state: "Provence-Alpes-Côte d'Azur", state_code: "PAC", zip_code: "13001", latitude: 43.2965, longitude: 5.3698, population: 870018, timezone: "Europe/Paris", region: "Sud", country: "France", country_code: "FR" },
  { city: "Lyon", county: null, state: "Auvergne-Rhône-Alpes", state_code: "ARA", zip_code: "69001", latitude: 45.764, longitude: 4.8357, population: 516092, timezone: "Europe/Paris", region: "Sud-Est", country: "France", country_code: "FR" },
  { city: "Toulouse", county: null, state: "Occitanie", state_code: "OCC", zip_code: "31000", latitude: 43.6047, longitude: 1.4442, population: 479553, timezone: "Europe/Paris", region: "Sud-Ouest", country: "France", country_code: "FR" },
  { city: "Nice", county: null, state: "Provence-Alpes-Côte d'Azur", state_code: "PAC", zip_code: "06000", latitude: 43.7102, longitude: 7.262, population: 342522, timezone: "Europe/Paris", region: "Sud", country: "France", country_code: "FR" },
  { city: "Nantes", county: null, state: "Pays de la Loire", state_code: "PDL", zip_code: "44000", latitude: 47.2184, longitude: -1.5536, population: 309346, timezone: "Europe/Paris", region: "Ouest", country: "France", country_code: "FR" },
  { city: "Strasbourg", county: null, state: "Grand Est", state_code: "GES", zip_code: "67000", latitude: 48.5734, longitude: 7.7521, population: 280966, timezone: "Europe/Paris", region: "Est", country: "France", country_code: "FR" },
  { city: "Montpellier", county: null, state: "Occitanie", state_code: "OCC", zip_code: "34000", latitude: 43.6108, longitude: 3.8767, population: 285121, timezone: "Europe/Paris", region: "Sud", country: "France", country_code: "FR" },
  { city: "Bordeaux", county: null, state: "Nouvelle-Aquitaine", state_code: "NAQ", zip_code: "33000", latitude: 44.8378, longitude: -0.5792, population: 254436, timezone: "Europe/Paris", region: "Sud-Ouest", country: "France", country_code: "FR" },
  { city: "Lille", county: null, state: "Hauts-de-France", state_code: "HDF", zip_code: "59000", latitude: 50.6292, longitude: 3.0573, population: 232741, timezone: "Europe/Paris", region: "Nord", country: "France", country_code: "FR" },
  { city: "Rennes", county: null, state: "Bretagne", state_code: "BRE", zip_code: "35000", latitude: 48.1173, longitude: -1.6778, population: 216815, timezone: "Europe/Paris", region: "Ouest", country: "France", country_code: "FR" },
  { city: "Reims", county: null, state: "Grand Est", state_code: "GES", zip_code: "51100", latitude: 49.2583, longitude: 4.0317, population: 182460, timezone: "Europe/Paris", region: "Est", country: "France", country_code: "FR" },
  { city: "Toulon", county: null, state: "Provence-Alpes-Côte d'Azur", state_code: "PAC", zip_code: "83000", latitude: 43.1242, longitude: 5.928, population: 171953, timezone: "Europe/Paris", region: "Sud", country: "France", country_code: "FR" },
  { city: "Grenoble", county: null, state: "Auvergne-Rhône-Alpes", state_code: "ARA", zip_code: "38000", latitude: 45.1885, longitude: 5.7245, population: 158454, timezone: "Europe/Paris", region: "Sud-Est", country: "France", country_code: "FR" },
  { city: "Dijon", county: null, state: "Bourgogne-Franche-Comté", state_code: "BFC", zip_code: "21000", latitude: 47.322, longitude: 5.0415, population: 155090, timezone: "Europe/Paris", region: "Est", country: "France", country_code: "FR" },
];

// ─── Germany ───
const DE_CITIES: CityEntry[] = [
  { city: "Berlin", county: null, state: "Berlin", state_code: "BE", zip_code: "10115", latitude: 52.52, longitude: 13.405, population: 3644826, timezone: "Europe/Berlin", region: "East", country: "Germany", country_code: "DE" },
  { city: "Hamburg", county: null, state: "Hamburg", state_code: "HH", zip_code: "20095", latitude: 53.5511, longitude: 9.9937, population: 1841179, timezone: "Europe/Berlin", region: "North", country: "Germany", country_code: "DE" },
  { city: "Munich", county: null, state: "Bavaria", state_code: "BY", zip_code: "80331", latitude: 48.1351, longitude: 11.582, population: 1471508, timezone: "Europe/Berlin", region: "South", country: "Germany", country_code: "DE" },
  { city: "Cologne", county: null, state: "North Rhine-Westphalia", state_code: "NW", zip_code: "50667", latitude: 50.9375, longitude: 6.9603, population: 1085664, timezone: "Europe/Berlin", region: "West", country: "Germany", country_code: "DE" },
  { city: "Frankfurt", county: null, state: "Hesse", state_code: "HE", zip_code: "60311", latitude: 50.1109, longitude: 8.6821, population: 753056, timezone: "Europe/Berlin", region: "West", country: "Germany", country_code: "DE" },
  { city: "Stuttgart", county: null, state: "Baden-Württemberg", state_code: "BW", zip_code: "70173", latitude: 48.7758, longitude: 9.1829, population: 634830, timezone: "Europe/Berlin", region: "South", country: "Germany", country_code: "DE" },
  { city: "Düsseldorf", county: null, state: "North Rhine-Westphalia", state_code: "NW", zip_code: "40213", latitude: 51.2277, longitude: 6.7735, population: 619294, timezone: "Europe/Berlin", region: "West", country: "Germany", country_code: "DE" },
  { city: "Leipzig", county: null, state: "Saxony", state_code: "SN", zip_code: "04109", latitude: 51.3397, longitude: 12.3731, population: 587857, timezone: "Europe/Berlin", region: "East", country: "Germany", country_code: "DE" },
  { city: "Dortmund", county: null, state: "North Rhine-Westphalia", state_code: "NW", zip_code: "44135", latitude: 51.5136, longitude: 7.4653, population: 588250, timezone: "Europe/Berlin", region: "West", country: "Germany", country_code: "DE" },
  { city: "Essen", county: null, state: "North Rhine-Westphalia", state_code: "NW", zip_code: "45127", latitude: 51.4556, longitude: 7.0116, population: 583109, timezone: "Europe/Berlin", region: "West", country: "Germany", country_code: "DE" },
  { city: "Bremen", county: null, state: "Bremen", state_code: "HB", zip_code: "28195", latitude: 53.0793, longitude: 8.8017, population: 569352, timezone: "Europe/Berlin", region: "North", country: "Germany", country_code: "DE" },
  { city: "Dresden", county: null, state: "Saxony", state_code: "SN", zip_code: "01067", latitude: 51.0504, longitude: 13.7373, population: 554649, timezone: "Europe/Berlin", region: "East", country: "Germany", country_code: "DE" },
  { city: "Hanover", county: null, state: "Lower Saxony", state_code: "NI", zip_code: "30159", latitude: 52.3759, longitude: 9.732, population: 538068, timezone: "Europe/Berlin", region: "North", country: "Germany", country_code: "DE" },
  { city: "Nuremberg", county: null, state: "Bavaria", state_code: "BY", zip_code: "90402", latitude: 49.4521, longitude: 11.0767, population: 518365, timezone: "Europe/Berlin", region: "South", country: "Germany", country_code: "DE" },
  { city: "Duisburg", county: null, state: "North Rhine-Westphalia", state_code: "NW", zip_code: "47051", latitude: 51.4344, longitude: 6.7623, population: 498590, timezone: "Europe/Berlin", region: "West", country: "Germany", country_code: "DE" },
];

// ─── Spain ───
const ES_CITIES: CityEntry[] = [
  { city: "Madrid", county: null, state: "Community of Madrid", state_code: "MD", zip_code: "28001", latitude: 40.4168, longitude: -3.7038, population: 3223334, timezone: "Europe/Madrid", region: "Central", country: "Spain", country_code: "ES" },
  { city: "Barcelona", county: null, state: "Catalonia", state_code: "CT", zip_code: "08001", latitude: 41.3851, longitude: 2.1734, population: 1620343, timezone: "Europe/Madrid", region: "Northeast", country: "Spain", country_code: "ES" },
  { city: "Valencia", county: null, state: "Valencian Community", state_code: "VC", zip_code: "46001", latitude: 39.4699, longitude: -0.3763, population: 791413, timezone: "Europe/Madrid", region: "East", country: "Spain", country_code: "ES" },
  { city: "Seville", county: null, state: "Andalusia", state_code: "AN", zip_code: "41001", latitude: 37.3891, longitude: -5.9845, population: 688711, timezone: "Europe/Madrid", region: "South", country: "Spain", country_code: "ES" },
  { city: "Zaragoza", county: null, state: "Aragon", state_code: "AR", zip_code: "50001", latitude: 41.6488, longitude: -0.8891, population: 674997, timezone: "Europe/Madrid", region: "Northeast", country: "Spain", country_code: "ES" },
  { city: "Málaga", county: null, state: "Andalusia", state_code: "AN", zip_code: "29001", latitude: 36.7213, longitude: -4.4217, population: 571026, timezone: "Europe/Madrid", region: "South", country: "Spain", country_code: "ES" },
  { city: "Murcia", county: null, state: "Region of Murcia", state_code: "MC", zip_code: "30001", latitude: 37.9922, longitude: -1.1307, population: 453258, timezone: "Europe/Madrid", region: "Southeast", country: "Spain", country_code: "ES" },
  { city: "Palma", county: null, state: "Balearic Islands", state_code: "IB", zip_code: "07001", latitude: 39.5696, longitude: 2.6502, population: 416065, timezone: "Europe/Madrid", region: "East", country: "Spain", country_code: "ES" },
  { city: "Bilbao", county: null, state: "Basque Country", state_code: "PV", zip_code: "48001", latitude: 43.263, longitude: -2.935, population: 346843, timezone: "Europe/Madrid", region: "North", country: "Spain", country_code: "ES" },
  { city: "Alicante", county: null, state: "Valencian Community", state_code: "VC", zip_code: "03001", latitude: 38.3452, longitude: -0.481, population: 334887, timezone: "Europe/Madrid", region: "East", country: "Spain", country_code: "ES" },
];

// ─── Italy ───
const IT_CITIES: CityEntry[] = [
  { city: "Rome", county: null, state: "Lazio", state_code: "RM", zip_code: "00100", latitude: 41.9028, longitude: 12.4964, population: 2873000, timezone: "Europe/Rome", region: "Central", country: "Italy", country_code: "IT" },
  { city: "Milan", county: null, state: "Lombardy", state_code: "MI", zip_code: "20121", latitude: 45.4642, longitude: 9.19, population: 1378689, timezone: "Europe/Rome", region: "North", country: "Italy", country_code: "IT" },
  { city: "Naples", county: null, state: "Campania", state_code: "NA", zip_code: "80100", latitude: 40.8518, longitude: 14.2681, population: 959470, timezone: "Europe/Rome", region: "South", country: "Italy", country_code: "IT" },
  { city: "Turin", county: null, state: "Piedmont", state_code: "TO", zip_code: "10121", latitude: 45.0703, longitude: 7.6869, population: 870952, timezone: "Europe/Rome", region: "North", country: "Italy", country_code: "IT" },
  { city: "Palermo", county: null, state: "Sicily", state_code: "PA", zip_code: "90100", latitude: 38.1157, longitude: 13.3615, population: 663401, timezone: "Europe/Rome", region: "South", country: "Italy", country_code: "IT" },
  { city: "Genoa", county: null, state: "Liguria", state_code: "GE", zip_code: "16121", latitude: 44.4056, longitude: 8.9463, population: 580097, timezone: "Europe/Rome", region: "North", country: "Italy", country_code: "IT" },
  { city: "Bologna", county: null, state: "Emilia-Romagna", state_code: "BO", zip_code: "40121", latitude: 44.4949, longitude: 11.3426, population: 390636, timezone: "Europe/Rome", region: "North", country: "Italy", country_code: "IT" },
  { city: "Florence", county: null, state: "Tuscany", state_code: "FI", zip_code: "50121", latitude: 43.7696, longitude: 11.2558, population: 382258, timezone: "Europe/Rome", region: "Central", country: "Italy", country_code: "IT" },
  { city: "Catania", county: null, state: "Sicily", state_code: "CT", zip_code: "95100", latitude: 37.5079, longitude: 15.0830, population: 311584, timezone: "Europe/Rome", region: "South", country: "Italy", country_code: "IT" },
  { city: "Venice", county: null, state: "Veneto", state_code: "VE", zip_code: "30100", latitude: 45.4408, longitude: 12.3155, population: 261905, timezone: "Europe/Rome", region: "North", country: "Italy", country_code: "IT" },
];

// ─── Australia ───
const AU_CITIES: CityEntry[] = [
  { city: "Sydney", county: null, state: "New South Wales", state_code: "NSW", zip_code: "2000", latitude: -33.8688, longitude: 151.2093, population: 5312000, timezone: "Australia/Sydney", region: "East", country: "Australia", country_code: "AU" },
  { city: "Melbourne", county: null, state: "Victoria", state_code: "VIC", zip_code: "3000", latitude: -37.8136, longitude: 144.9631, population: 5078000, timezone: "Australia/Melbourne", region: "Southeast", country: "Australia", country_code: "AU" },
  { city: "Brisbane", county: null, state: "Queensland", state_code: "QLD", zip_code: "4000", latitude: -27.4698, longitude: 153.0251, population: 2514000, timezone: "Australia/Brisbane", region: "East", country: "Australia", country_code: "AU" },
  { city: "Perth", county: null, state: "Western Australia", state_code: "WA", zip_code: "6000", latitude: -31.9505, longitude: 115.8605, population: 2085000, timezone: "Australia/Perth", region: "West", country: "Australia", country_code: "AU" },
  { city: "Adelaide", county: null, state: "South Australia", state_code: "SA", zip_code: "5000", latitude: -34.9285, longitude: 138.6007, population: 1376000, timezone: "Australia/Adelaide", region: "South", country: "Australia", country_code: "AU" },
  { city: "Gold Coast", county: null, state: "Queensland", state_code: "QLD", zip_code: "4217", latitude: -28.0167, longitude: 153.4, population: 679127, timezone: "Australia/Brisbane", region: "East", country: "Australia", country_code: "AU" },
  { city: "Canberra", county: null, state: "Australian Capital Territory", state_code: "ACT", zip_code: "2600", latitude: -35.2809, longitude: 149.13, population: 462213, timezone: "Australia/Sydney", region: "Southeast", country: "Australia", country_code: "AU" },
  { city: "Hobart", county: null, state: "Tasmania", state_code: "TAS", zip_code: "7000", latitude: -42.8821, longitude: 147.3272, population: 240342, timezone: "Australia/Hobart", region: "South", country: "Australia", country_code: "AU" },
  { city: "Darwin", county: null, state: "Northern Territory", state_code: "NT", zip_code: "0800", latitude: -12.4634, longitude: 130.8456, population: 147255, timezone: "Australia/Darwin", region: "North", country: "Australia", country_code: "AU" },
  { city: "Wollongong", county: null, state: "New South Wales", state_code: "NSW", zip_code: "2500", latitude: -34.4278, longitude: 150.8931, population: 302739, timezone: "Australia/Sydney", region: "East", country: "Australia", country_code: "AU" },
];

// ─── Netherlands ───
const NL_CITIES: CityEntry[] = [
  { city: "Amsterdam", county: null, state: "North Holland", state_code: "NH", zip_code: "1012", latitude: 52.3676, longitude: 4.9041, population: 872680, timezone: "Europe/Amsterdam", region: "West", country: "Netherlands", country_code: "NL" },
  { city: "Rotterdam", county: null, state: "South Holland", state_code: "ZH", zip_code: "3011", latitude: 51.9244, longitude: 4.4777, population: 651446, timezone: "Europe/Amsterdam", region: "West", country: "Netherlands", country_code: "NL" },
  { city: "The Hague", county: null, state: "South Holland", state_code: "ZH", zip_code: "2511", latitude: 52.0705, longitude: 4.3007, population: 545838, timezone: "Europe/Amsterdam", region: "West", country: "Netherlands", country_code: "NL" },
  { city: "Utrecht", county: null, state: "Utrecht", state_code: "UT", zip_code: "3511", latitude: 52.0907, longitude: 5.1214, population: 357694, timezone: "Europe/Amsterdam", region: "Central", country: "Netherlands", country_code: "NL" },
  { city: "Eindhoven", county: null, state: "North Brabant", state_code: "NB", zip_code: "5611", latitude: 51.4416, longitude: 5.4697, population: 234456, timezone: "Europe/Amsterdam", region: "South", country: "Netherlands", country_code: "NL" },
  { city: "Groningen", county: null, state: "Groningen", state_code: "GR", zip_code: "9711", latitude: 53.2194, longitude: 6.5665, population: 233218, timezone: "Europe/Amsterdam", region: "North", country: "Netherlands", country_code: "NL" },
  { city: "Tilburg", county: null, state: "North Brabant", state_code: "NB", zip_code: "5038", latitude: 51.5555, longitude: 5.0913, population: 219632, timezone: "Europe/Amsterdam", region: "South", country: "Netherlands", country_code: "NL" },
  { city: "Breda", county: null, state: "North Brabant", state_code: "NB", zip_code: "4811", latitude: 51.5719, longitude: 4.7683, population: 184126, timezone: "Europe/Amsterdam", region: "South", country: "Netherlands", country_code: "NL" },
];

// ─── India ───
const IN_CITIES: CityEntry[] = [
  { city: "Mumbai", county: null, state: "Maharashtra", state_code: "MH", zip_code: "400001", latitude: 19.076, longitude: 72.8777, population: 12442373, timezone: "Asia/Kolkata", region: "West", country: "India", country_code: "IN" },
  { city: "Delhi", county: null, state: "Delhi", state_code: "DL", zip_code: "110001", latitude: 28.7041, longitude: 77.1025, population: 11034555, timezone: "Asia/Kolkata", region: "North", country: "India", country_code: "IN" },
  { city: "Bangalore", county: null, state: "Karnataka", state_code: "KA", zip_code: "560001", latitude: 12.9716, longitude: 77.5946, population: 8443675, timezone: "Asia/Kolkata", region: "South", country: "India", country_code: "IN" },
  { city: "Hyderabad", county: null, state: "Telangana", state_code: "TG", zip_code: "500001", latitude: 17.385, longitude: 78.4867, population: 6809970, timezone: "Asia/Kolkata", region: "South", country: "India", country_code: "IN" },
  { city: "Ahmedabad", county: null, state: "Gujarat", state_code: "GJ", zip_code: "380001", latitude: 23.0225, longitude: 72.5714, population: 5570585, timezone: "Asia/Kolkata", region: "West", country: "India", country_code: "IN" },
  { city: "Chennai", county: null, state: "Tamil Nadu", state_code: "TN", zip_code: "600001", latitude: 13.0827, longitude: 80.2707, population: 4681087, timezone: "Asia/Kolkata", region: "South", country: "India", country_code: "IN" },
  { city: "Kolkata", county: null, state: "West Bengal", state_code: "WB", zip_code: "700001", latitude: 22.5726, longitude: 88.3639, population: 4496694, timezone: "Asia/Kolkata", region: "East", country: "India", country_code: "IN" },
  { city: "Pune", county: null, state: "Maharashtra", state_code: "MH", zip_code: "411001", latitude: 18.5204, longitude: 73.8567, population: 3124458, timezone: "Asia/Kolkata", region: "West", country: "India", country_code: "IN" },
  { city: "Jaipur", county: null, state: "Rajasthan", state_code: "RJ", zip_code: "302001", latitude: 26.9124, longitude: 75.7873, population: 3073350, timezone: "Asia/Kolkata", region: "North", country: "India", country_code: "IN" },
  { city: "Lucknow", county: null, state: "Uttar Pradesh", state_code: "UP", zip_code: "226001", latitude: 26.8467, longitude: 80.9462, population: 2817105, timezone: "Asia/Kolkata", region: "North", country: "India", country_code: "IN" },
  { city: "Kanpur", county: null, state: "Uttar Pradesh", state_code: "UP", zip_code: "208001", latitude: 26.4499, longitude: 80.3319, population: 2767031, timezone: "Asia/Kolkata", region: "North", country: "India", country_code: "IN" },
  { city: "Nagpur", county: null, state: "Maharashtra", state_code: "MH", zip_code: "440001", latitude: 21.1458, longitude: 79.0882, population: 2405421, timezone: "Asia/Kolkata", region: "West", country: "India", country_code: "IN" },
];

// ─── Brazil ───
const BR_CITIES: CityEntry[] = [
  { city: "São Paulo", county: null, state: "São Paulo", state_code: "SP", zip_code: "01000-000", latitude: -23.5505, longitude: -46.6333, population: 12325232, timezone: "America/Sao_Paulo", region: "Southeast", country: "Brazil", country_code: "BR" },
  { city: "Rio de Janeiro", county: null, state: "Rio de Janeiro", state_code: "RJ", zip_code: "20040-020", latitude: -22.9068, longitude: -43.1729, population: 6747815, timezone: "America/Sao_Paulo", region: "Southeast", country: "Brazil", country_code: "BR" },
  { city: "Brasília", county: null, state: "Federal District", state_code: "DF", zip_code: "70040-010", latitude: -15.7975, longitude: -47.8919, population: 3055149, timezone: "America/Sao_Paulo", region: "Central-West", country: "Brazil", country_code: "BR" },
  { city: "Salvador", county: null, state: "Bahia", state_code: "BA", zip_code: "40020-000", latitude: -12.9714, longitude: -38.5124, population: 2886698, timezone: "America/Bahia", region: "Northeast", country: "Brazil", country_code: "BR" },
  { city: "Fortaleza", county: null, state: "Ceará", state_code: "CE", zip_code: "60060-000", latitude: -3.7172, longitude: -38.5433, population: 2686612, timezone: "America/Fortaleza", region: "Northeast", country: "Brazil", country_code: "BR" },
  { city: "Belo Horizonte", county: null, state: "Minas Gerais", state_code: "MG", zip_code: "30130-000", latitude: -19.9167, longitude: -43.9345, population: 2521564, timezone: "America/Sao_Paulo", region: "Southeast", country: "Brazil", country_code: "BR" },
  { city: "Manaus", county: null, state: "Amazonas", state_code: "AM", zip_code: "69020-000", latitude: -3.119, longitude: -60.0217, population: 2219580, timezone: "America/Manaus", region: "North", country: "Brazil", country_code: "BR" },
  { city: "Curitiba", county: null, state: "Paraná", state_code: "PR", zip_code: "80020-000", latitude: -25.4284, longitude: -49.2733, population: 1948626, timezone: "America/Sao_Paulo", region: "South", country: "Brazil", country_code: "BR" },
  { city: "Recife", county: null, state: "Pernambuco", state_code: "PE", zip_code: "50030-000", latitude: -8.0476, longitude: -34.877, population: 1653461, timezone: "America/Recife", region: "Northeast", country: "Brazil", country_code: "BR" },
  { city: "Porto Alegre", county: null, state: "Rio Grande do Sul", state_code: "RS", zip_code: "90010-000", latitude: -30.0346, longitude: -51.2177, population: 1488252, timezone: "America/Sao_Paulo", region: "South", country: "Brazil", country_code: "BR" },
];

// Map of country_code → city arrays
const COUNTRY_DATA: Record<string, CityEntry[]> = {
  US: US_CITIES,
  GB: UK_CITIES,
  CA: CA_CITIES,
  FR: FR_CITIES,
  DE: DE_CITIES,
  ES: ES_CITIES,
  IT: IT_CITIES,
  AU: AU_CITIES,
  NL: NL_CITIES,
  IN: IN_CITIES,
  BR: BR_CITIES,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Accept optional country_code param (default: seed ALL countries)
    let body: { country_code?: string } = {};
    try { body = await req.json(); } catch { /* empty body ok */ }

    const targetCodes = body.country_code
      ? [body.country_code.toUpperCase()]
      : Object.keys(COUNTRY_DATA);

    let totalInserted = 0;

    for (const code of targetCodes) {
      const cities = COUNTRY_DATA[code];
      if (!cities) continue;

      // Check if already seeded for this country
      const { count } = await supabase
        .from("locations")
        .select("id", { count: "exact", head: true })
        .eq("country_code", code);
      if (count && count >= cities.length) continue;

      // Deduplicate by city+state_code
      const seen = new Set<string>();
      const unique = cities.filter((c) => {
        const key = `${c.city}-${c.state_code}-${c.country_code}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Insert in batches of 50
      for (let i = 0; i < unique.length; i += 50) {
        const batch = unique.slice(i, i + 50).map((c) => ({
          city: c.city,
          county: c.county,
          state: c.state,
          state_code: c.state_code,
          zip_code: c.zip_code,
          country: c.country,
          country_code: c.country_code,
          latitude: c.latitude,
          longitude: c.longitude,
          population: c.population,
          timezone: c.timezone,
          region: c.region,
        }));
        const { error } = await supabase.from("locations").insert(batch);
        if (error) throw error;
        totalInserted += batch.length;
      }
    }

    return new Response(JSON.stringify({ message: "Seeded successfully", inserted: totalInserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
