import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Top 500 US cities with real data
const US_CITIES = [
  // Alabama
  { city: "Birmingham", county: "Jefferson", state: "Alabama", state_code: "AL", zip_code: "35203", latitude: 33.5207, longitude: -86.8025, population: 200733, timezone: "America/Chicago", region: "Southeast" },
  { city: "Montgomery", county: "Montgomery", state: "Alabama", state_code: "AL", zip_code: "36104", latitude: 32.3792, longitude: -86.3077, population: 200603, timezone: "America/Chicago", region: "Southeast" },
  { city: "Huntsville", county: "Madison", state: "Alabama", state_code: "AL", zip_code: "35801", latitude: 34.7304, longitude: -86.5861, population: 215006, timezone: "America/Chicago", region: "Southeast" },
  { city: "Mobile", county: "Mobile", state: "Alabama", state_code: "AL", zip_code: "36602", latitude: 30.6954, longitude: -88.0399, population: 187041, timezone: "America/Chicago", region: "Southeast" },
  // Alaska
  { city: "Anchorage", county: "Anchorage", state: "Alaska", state_code: "AK", zip_code: "99501", latitude: 61.2181, longitude: -149.9003, population: 291247, timezone: "America/Anchorage", region: "West" },
  { city: "Fairbanks", county: "Fairbanks North Star", state: "Alaska", state_code: "AK", zip_code: "99701", latitude: 64.8378, longitude: -147.7164, population: 32325, timezone: "America/Anchorage", region: "West" },
  // Arizona
  { city: "Phoenix", county: "Maricopa", state: "Arizona", state_code: "AZ", zip_code: "85004", latitude: 33.4484, longitude: -112.074, population: 1608139, timezone: "America/Phoenix", region: "Southwest" },
  { city: "Tucson", county: "Pima", state: "Arizona", state_code: "AZ", zip_code: "85701", latitude: 32.2226, longitude: -110.9747, population: 542629, timezone: "America/Phoenix", region: "Southwest" },
  { city: "Mesa", county: "Maricopa", state: "Arizona", state_code: "AZ", zip_code: "85201", latitude: 33.4152, longitude: -111.8315, population: 504258, timezone: "America/Phoenix", region: "Southwest" },
  { city: "Scottsdale", county: "Maricopa", state: "Arizona", state_code: "AZ", zip_code: "85251", latitude: 33.4942, longitude: -111.9261, population: 241361, timezone: "America/Phoenix", region: "Southwest" },
  { city: "Chandler", county: "Maricopa", state: "Arizona", state_code: "AZ", zip_code: "85225", latitude: 33.3062, longitude: -111.8413, population: 275987, timezone: "America/Phoenix", region: "Southwest" },
  { city: "Tempe", county: "Maricopa", state: "Arizona", state_code: "AZ", zip_code: "85281", latitude: 33.4255, longitude: -111.9400, population: 180587, timezone: "America/Phoenix", region: "Southwest" },
  { city: "Gilbert", county: "Maricopa", state: "Arizona", state_code: "AZ", zip_code: "85234", latitude: 33.3528, longitude: -111.7890, population: 267918, timezone: "America/Phoenix", region: "Southwest" },
  { city: "Glendale", county: "Maricopa", state: "Arizona", state_code: "AZ", zip_code: "85301", latitude: 33.5387, longitude: -112.1860, population: 248325, timezone: "America/Phoenix", region: "Southwest" },
  // Arkansas
  { city: "Little Rock", county: "Pulaski", state: "Arkansas", state_code: "AR", zip_code: "72201", latitude: 34.7465, longitude: -92.2896, population: 202591, timezone: "America/Chicago", region: "Southeast" },
  // California
  { city: "Los Angeles", county: "Los Angeles", state: "California", state_code: "CA", zip_code: "90012", latitude: 34.0522, longitude: -118.2437, population: 3898747, timezone: "America/Los_Angeles", region: "West" },
  { city: "San Diego", county: "San Diego", state: "California", state_code: "CA", zip_code: "92101", latitude: 32.7157, longitude: -117.1611, population: 1386932, timezone: "America/Los_Angeles", region: "West" },
  { city: "San Jose", county: "Santa Clara", state: "California", state_code: "CA", zip_code: "95113", latitude: 37.3382, longitude: -121.8863, population: 1013240, timezone: "America/Los_Angeles", region: "West" },
  { city: "San Francisco", county: "San Francisco", state: "California", state_code: "CA", zip_code: "94102", latitude: 37.7749, longitude: -122.4194, population: 873965, timezone: "America/Los_Angeles", region: "West" },
  { city: "Fresno", county: "Fresno", state: "California", state_code: "CA", zip_code: "93721", latitude: 36.7378, longitude: -119.7871, population: 542107, timezone: "America/Los_Angeles", region: "West" },
  { city: "Sacramento", county: "Sacramento", state: "California", state_code: "CA", zip_code: "95814", latitude: 38.5816, longitude: -121.4944, population: 524943, timezone: "America/Los_Angeles", region: "West" },
  { city: "Long Beach", county: "Los Angeles", state: "California", state_code: "CA", zip_code: "90802", latitude: 33.7701, longitude: -118.1937, population: 466742, timezone: "America/Los_Angeles", region: "West" },
  { city: "Oakland", county: "Alameda", state: "California", state_code: "CA", zip_code: "94612", latitude: 37.8044, longitude: -122.2712, population: 433031, timezone: "America/Los_Angeles", region: "West" },
  { city: "Bakersfield", county: "Kern", state: "California", state_code: "CA", zip_code: "93301", latitude: 35.3733, longitude: -119.0187, population: 403455, timezone: "America/Los_Angeles", region: "West" },
  { city: "Anaheim", county: "Orange", state: "California", state_code: "CA", zip_code: "92805", latitude: 33.8366, longitude: -117.9143, population: 350365, timezone: "America/Los_Angeles", region: "West" },
  { city: "Santa Ana", county: "Orange", state: "California", state_code: "CA", zip_code: "92701", latitude: 33.7455, longitude: -117.8677, population: 310227, timezone: "America/Los_Angeles", region: "West" },
  { city: "Riverside", county: "Riverside", state: "California", state_code: "CA", zip_code: "92501", latitude: 33.9533, longitude: -117.3962, population: 314998, timezone: "America/Los_Angeles", region: "West" },
  { city: "Stockton", county: "San Joaquin", state: "California", state_code: "CA", zip_code: "95202", latitude: 37.9577, longitude: -121.2908, population: 320804, timezone: "America/Los_Angeles", region: "West" },
  { city: "Irvine", county: "Orange", state: "California", state_code: "CA", zip_code: "92618", latitude: 33.6846, longitude: -117.8265, population: 307670, timezone: "America/Los_Angeles", region: "West" },
  // Colorado
  { city: "Denver", county: "Denver", state: "Colorado", state_code: "CO", zip_code: "80202", latitude: 39.7392, longitude: -104.9903, population: 715522, timezone: "America/Denver", region: "West" },
  { city: "Colorado Springs", county: "El Paso", state: "Colorado", state_code: "CO", zip_code: "80903", latitude: 38.8339, longitude: -104.8214, population: 478961, timezone: "America/Denver", region: "West" },
  { city: "Aurora", county: "Arapahoe", state: "Colorado", state_code: "CO", zip_code: "80012", latitude: 39.7294, longitude: -104.8319, population: 386261, timezone: "America/Denver", region: "West" },
  { city: "Fort Collins", county: "Larimer", state: "Colorado", state_code: "CO", zip_code: "80521", latitude: 40.5853, longitude: -105.0844, population: 169810, timezone: "America/Denver", region: "West" },
  { city: "Boulder", county: "Boulder", state: "Colorado", state_code: "CO", zip_code: "80302", latitude: 40.0150, longitude: -105.2705, population: 105673, timezone: "America/Denver", region: "West" },
  // Connecticut
  { city: "Bridgeport", county: "Fairfield", state: "Connecticut", state_code: "CT", zip_code: "06604", latitude: 41.1865, longitude: -73.1952, population: 148529, timezone: "America/New_York", region: "Northeast" },
  { city: "New Haven", county: "New Haven", state: "Connecticut", state_code: "CT", zip_code: "06510", latitude: 41.3083, longitude: -72.9279, population: 134023, timezone: "America/New_York", region: "Northeast" },
  { city: "Hartford", county: "Hartford", state: "Connecticut", state_code: "CT", zip_code: "06103", latitude: 41.7658, longitude: -72.6734, population: 121054, timezone: "America/New_York", region: "Northeast" },
  { city: "Stamford", county: "Fairfield", state: "Connecticut", state_code: "CT", zip_code: "06901", latitude: 41.0534, longitude: -73.5387, population: 135470, timezone: "America/New_York", region: "Northeast" },
  // Delaware
  { city: "Wilmington", county: "New Castle", state: "Delaware", state_code: "DE", zip_code: "19801", latitude: 39.7391, longitude: -75.5398, population: 70898, timezone: "America/New_York", region: "Northeast" },
  { city: "Dover", county: "Kent", state: "Delaware", state_code: "DE", zip_code: "19901", latitude: 39.1582, longitude: -75.5244, population: 39403, timezone: "America/New_York", region: "Northeast" },
  // Florida
  { city: "Jacksonville", county: "Duval", state: "Florida", state_code: "FL", zip_code: "32202", latitude: 30.3322, longitude: -81.6557, population: 949611, timezone: "America/New_York", region: "Southeast" },
  { city: "Miami", county: "Miami-Dade", state: "Florida", state_code: "FL", zip_code: "33130", latitude: 25.7617, longitude: -80.1918, population: 442241, timezone: "America/New_York", region: "Southeast" },
  { city: "Tampa", county: "Hillsborough", state: "Florida", state_code: "FL", zip_code: "33602", latitude: 27.9506, longitude: -82.4572, population: 384959, timezone: "America/New_York", region: "Southeast" },
  { city: "Orlando", county: "Orange", state: "Florida", state_code: "FL", zip_code: "32801", latitude: 28.5383, longitude: -81.3792, population: 307573, timezone: "America/New_York", region: "Southeast" },
  { city: "St. Petersburg", county: "Pinellas", state: "Florida", state_code: "FL", zip_code: "33701", latitude: 27.7676, longitude: -82.6403, population: 258308, timezone: "America/New_York", region: "Southeast" },
  { city: "Fort Lauderdale", county: "Broward", state: "Florida", state_code: "FL", zip_code: "33301", latitude: 26.1224, longitude: -80.1373, population: 182760, timezone: "America/New_York", region: "Southeast" },
  { city: "Tallahassee", county: "Leon", state: "Florida", state_code: "FL", zip_code: "32301", latitude: 30.4383, longitude: -84.2807, population: 196169, timezone: "America/New_York", region: "Southeast" },
  // Georgia
  { city: "Atlanta", county: "Fulton", state: "Georgia", state_code: "GA", zip_code: "30303", latitude: 33.749, longitude: -84.388, population: 498715, timezone: "America/New_York", region: "Southeast" },
  { city: "Augusta", county: "Richmond", state: "Georgia", state_code: "GA", zip_code: "30901", latitude: 33.4735, longitude: -81.9748, population: 202081, timezone: "America/New_York", region: "Southeast" },
  { city: "Savannah", county: "Chatham", state: "Georgia", state_code: "GA", zip_code: "31401", latitude: 32.0809, longitude: -81.0912, population: 147780, timezone: "America/New_York", region: "Southeast" },
  // Hawaii
  { city: "Honolulu", county: "Honolulu", state: "Hawaii", state_code: "HI", zip_code: "96813", latitude: 21.3069, longitude: -157.8583, population: 350964, timezone: "Pacific/Honolulu", region: "West" },
  // Idaho
  { city: "Boise", county: "Ada", state: "Idaho", state_code: "ID", zip_code: "83702", latitude: 43.615, longitude: -116.2023, population: 235684, timezone: "America/Boise", region: "West" },
  // Illinois
  { city: "Chicago", county: "Cook", state: "Illinois", state_code: "IL", zip_code: "60601", latitude: 41.8781, longitude: -87.6298, population: 2693976, timezone: "America/Chicago", region: "Midwest" },
  { city: "Aurora", county: "Kane", state: "Illinois", state_code: "IL", zip_code: "60506", latitude: 41.7606, longitude: -88.3201, population: 180542, timezone: "America/Chicago", region: "Midwest" },
  { city: "Naperville", county: "DuPage", state: "Illinois", state_code: "IL", zip_code: "60540", latitude: 41.7508, longitude: -88.1535, population: 149540, timezone: "America/Chicago", region: "Midwest" },
  { city: "Rockford", county: "Winnebago", state: "Illinois", state_code: "IL", zip_code: "61101", latitude: 42.2711, longitude: -89.0940, population: 148655, timezone: "America/Chicago", region: "Midwest" },
  { city: "Springfield", county: "Sangamon", state: "Illinois", state_code: "IL", zip_code: "62701", latitude: 39.7817, longitude: -89.6501, population: 114394, timezone: "America/Chicago", region: "Midwest" },
  // Indiana
  { city: "Indianapolis", county: "Marion", state: "Indiana", state_code: "IN", zip_code: "46204", latitude: 39.7684, longitude: -86.1581, population: 887642, timezone: "America/Indiana/Indianapolis", region: "Midwest" },
  { city: "Fort Wayne", county: "Allen", state: "Indiana", state_code: "IN", zip_code: "46802", latitude: 41.0793, longitude: -85.1394, population: 263886, timezone: "America/Indiana/Indianapolis", region: "Midwest" },
  { city: "South Bend", county: "St. Joseph", state: "Indiana", state_code: "IN", zip_code: "46601", latitude: 41.6764, longitude: -86.2520, population: 103453, timezone: "America/Indiana/Indianapolis", region: "Midwest" },
  // Iowa
  { city: "Des Moines", county: "Polk", state: "Iowa", state_code: "IA", zip_code: "50309", latitude: 41.5868, longitude: -93.625, population: 214133, timezone: "America/Chicago", region: "Midwest" },
  { city: "Cedar Rapids", county: "Linn", state: "Iowa", state_code: "IA", zip_code: "52401", latitude: 41.9779, longitude: -91.6656, population: 137710, timezone: "America/Chicago", region: "Midwest" },
  // Kansas
  { city: "Wichita", county: "Sedgwick", state: "Kansas", state_code: "KS", zip_code: "67202", latitude: 37.6872, longitude: -97.3301, population: 397532, timezone: "America/Chicago", region: "Midwest" },
  { city: "Overland Park", county: "Johnson", state: "Kansas", state_code: "KS", zip_code: "66210", latitude: 38.9822, longitude: -94.6708, population: 197238, timezone: "America/Chicago", region: "Midwest" },
  { city: "Kansas City", county: "Wyandotte", state: "Kansas", state_code: "KS", zip_code: "66101", latitude: 39.1142, longitude: -94.6275, population: 156607, timezone: "America/Chicago", region: "Midwest" },
  // Kentucky
  { city: "Louisville", county: "Jefferson", state: "Kentucky", state_code: "KY", zip_code: "40202", latitude: 38.2527, longitude: -85.7585, population: 633045, timezone: "America/Kentucky/Louisville", region: "Southeast" },
  { city: "Lexington", county: "Fayette", state: "Kentucky", state_code: "KY", zip_code: "40507", latitude: 38.0406, longitude: -84.5037, population: 322570, timezone: "America/Kentucky/Louisville", region: "Southeast" },
  // Louisiana
  { city: "New Orleans", county: "Orleans", state: "Louisiana", state_code: "LA", zip_code: "70112", latitude: 29.9511, longitude: -90.0715, population: 383997, timezone: "America/Chicago", region: "Southeast" },
  { city: "Baton Rouge", county: "East Baton Rouge", state: "Louisiana", state_code: "LA", zip_code: "70801", latitude: 30.4515, longitude: -91.1871, population: 227470, timezone: "America/Chicago", region: "Southeast" },
  // Maine
  { city: "Portland", county: "Cumberland", state: "Maine", state_code: "ME", zip_code: "04101", latitude: 43.6591, longitude: -70.2568, population: 68408, timezone: "America/New_York", region: "Northeast" },
  // Maryland
  { city: "Baltimore", county: "Baltimore City", state: "Maryland", state_code: "MD", zip_code: "21202", latitude: 39.2904, longitude: -76.6122, population: 585708, timezone: "America/New_York", region: "Northeast" },
  { city: "Frederick", county: "Frederick", state: "Maryland", state_code: "MD", zip_code: "21701", latitude: 39.4143, longitude: -77.4105, population: 78171, timezone: "America/New_York", region: "Northeast" },
  // Massachusetts
  { city: "Boston", county: "Suffolk", state: "Massachusetts", state_code: "MA", zip_code: "02108", latitude: 42.3601, longitude: -71.0589, population: 675647, timezone: "America/New_York", region: "Northeast" },
  { city: "Worcester", county: "Worcester", state: "Massachusetts", state_code: "MA", zip_code: "01608", latitude: 42.2626, longitude: -71.8023, population: 206518, timezone: "America/New_York", region: "Northeast" },
  { city: "Springfield", county: "Hampden", state: "Massachusetts", state_code: "MA", zip_code: "01103", latitude: 42.1015, longitude: -72.5898, population: 155929, timezone: "America/New_York", region: "Northeast" },
  { city: "Cambridge", county: "Middlesex", state: "Massachusetts", state_code: "MA", zip_code: "02139", latitude: 42.3736, longitude: -71.1097, population: 118403, timezone: "America/New_York", region: "Northeast" },
  // Michigan
  { city: "Detroit", county: "Wayne", state: "Michigan", state_code: "MI", zip_code: "48226", latitude: 42.3314, longitude: -83.0458, population: 639111, timezone: "America/Detroit", region: "Midwest" },
  { city: "Grand Rapids", county: "Kent", state: "Michigan", state_code: "MI", zip_code: "49503", latitude: 42.9634, longitude: -85.6681, population: 198917, timezone: "America/Detroit", region: "Midwest" },
  { city: "Ann Arbor", county: "Washtenaw", state: "Michigan", state_code: "MI", zip_code: "48104", latitude: 42.2808, longitude: -83.7430, population: 123851, timezone: "America/Detroit", region: "Midwest" },
  // Minnesota
  { city: "Minneapolis", county: "Hennepin", state: "Minnesota", state_code: "MN", zip_code: "55401", latitude: 44.9778, longitude: -93.265, population: 429954, timezone: "America/Chicago", region: "Midwest" },
  { city: "St. Paul", county: "Ramsey", state: "Minnesota", state_code: "MN", zip_code: "55101", latitude: 44.9537, longitude: -93.089, population: 311527, timezone: "America/Chicago", region: "Midwest" },
  { city: "Rochester", county: "Olmsted", state: "Minnesota", state_code: "MN", zip_code: "55901", latitude: 44.0121, longitude: -92.4802, population: 121395, timezone: "America/Chicago", region: "Midwest" },
  // Mississippi
  { city: "Jackson", county: "Hinds", state: "Mississippi", state_code: "MS", zip_code: "39201", latitude: 32.2988, longitude: -90.1848, population: 153701, timezone: "America/Chicago", region: "Southeast" },
  // Missouri
  { city: "Kansas City", county: "Jackson", state: "Missouri", state_code: "MO", zip_code: "64106", latitude: 39.0997, longitude: -94.5786, population: 508090, timezone: "America/Chicago", region: "Midwest" },
  { city: "St. Louis", county: "St. Louis City", state: "Missouri", state_code: "MO", zip_code: "63101", latitude: 38.627, longitude: -90.1994, population: 301578, timezone: "America/Chicago", region: "Midwest" },
  { city: "Springfield", county: "Greene", state: "Missouri", state_code: "MO", zip_code: "65806", latitude: 37.2090, longitude: -93.2923, population: 169176, timezone: "America/Chicago", region: "Midwest" },
  // Montana
  { city: "Billings", county: "Yellowstone", state: "Montana", state_code: "MT", zip_code: "59101", latitude: 45.7833, longitude: -108.5007, population: 117116, timezone: "America/Denver", region: "West" },
  // Nebraska
  { city: "Omaha", county: "Douglas", state: "Nebraska", state_code: "NE", zip_code: "68102", latitude: 41.2565, longitude: -95.9345, population: 486051, timezone: "America/Chicago", region: "Midwest" },
  { city: "Lincoln", county: "Lancaster", state: "Nebraska", state_code: "NE", zip_code: "68508", latitude: 40.8136, longitude: -96.7026, population: 291082, timezone: "America/Chicago", region: "Midwest" },
  // Nevada
  { city: "Las Vegas", county: "Clark", state: "Nevada", state_code: "NV", zip_code: "89101", latitude: 36.1699, longitude: -115.1398, population: 641903, timezone: "America/Los_Angeles", region: "West" },
  { city: "Henderson", county: "Clark", state: "Nevada", state_code: "NV", zip_code: "89015", latitude: 36.0395, longitude: -114.9817, population: 320189, timezone: "America/Los_Angeles", region: "West" },
  { city: "Reno", county: "Washoe", state: "Nevada", state_code: "NV", zip_code: "89501", latitude: 39.5296, longitude: -119.8138, population: 264165, timezone: "America/Los_Angeles", region: "West" },
  // New Hampshire
  { city: "Manchester", county: "Hillsborough", state: "New Hampshire", state_code: "NH", zip_code: "03101", latitude: 42.9956, longitude: -71.4548, population: 115644, timezone: "America/New_York", region: "Northeast" },
  // New Jersey
  { city: "Newark", county: "Essex", state: "New Jersey", state_code: "NJ", zip_code: "07102", latitude: 40.7357, longitude: -74.1724, population: 311549, timezone: "America/New_York", region: "Northeast" },
  { city: "Jersey City", county: "Hudson", state: "New Jersey", state_code: "NJ", zip_code: "07302", latitude: 40.7178, longitude: -74.0431, population: 292449, timezone: "America/New_York", region: "Northeast" },
  { city: "Paterson", county: "Passaic", state: "New Jersey", state_code: "NJ", zip_code: "07505", latitude: 40.9168, longitude: -74.1718, population: 159732, timezone: "America/New_York", region: "Northeast" },
  // New Mexico
  { city: "Albuquerque", county: "Bernalillo", state: "New Mexico", state_code: "NM", zip_code: "87102", latitude: 35.0844, longitude: -106.6504, population: 564559, timezone: "America/Denver", region: "Southwest" },
  { city: "Santa Fe", county: "Santa Fe", state: "New Mexico", state_code: "NM", zip_code: "87501", latitude: 35.687, longitude: -105.9378, population: 87505, timezone: "America/Denver", region: "Southwest" },
  // New York
  { city: "New York", county: "New York", state: "New York", state_code: "NY", zip_code: "10001", latitude: 40.7128, longitude: -74.006, population: 8336817, timezone: "America/New_York", region: "Northeast" },
  { city: "Buffalo", county: "Erie", state: "New York", state_code: "NY", zip_code: "14202", latitude: 42.8864, longitude: -78.8784, population: 278349, timezone: "America/New_York", region: "Northeast" },
  { city: "Rochester", county: "Monroe", state: "New York", state_code: "NY", zip_code: "14604", latitude: 43.1566, longitude: -77.6088, population: 211328, timezone: "America/New_York", region: "Northeast" },
  { city: "Syracuse", county: "Onondaga", state: "New York", state_code: "NY", zip_code: "13202", latitude: 43.0481, longitude: -76.1474, population: 148620, timezone: "America/New_York", region: "Northeast" },
  { city: "Albany", county: "Albany", state: "New York", state_code: "NY", zip_code: "12207", latitude: 42.6526, longitude: -73.7562, population: 99224, timezone: "America/New_York", region: "Northeast" },
  // North Carolina
  { city: "Charlotte", county: "Mecklenburg", state: "North Carolina", state_code: "NC", zip_code: "28202", latitude: 35.2271, longitude: -80.8431, population: 874579, timezone: "America/New_York", region: "Southeast" },
  { city: "Raleigh", county: "Wake", state: "North Carolina", state_code: "NC", zip_code: "27601", latitude: 35.7796, longitude: -78.6382, population: 467665, timezone: "America/New_York", region: "Southeast" },
  { city: "Greensboro", county: "Guilford", state: "North Carolina", state_code: "NC", zip_code: "27401", latitude: 36.0726, longitude: -79.792, population: 299035, timezone: "America/New_York", region: "Southeast" },
  { city: "Durham", county: "Durham", state: "North Carolina", state_code: "NC", zip_code: "27701", latitude: 35.994, longitude: -78.8986, population: 283506, timezone: "America/New_York", region: "Southeast" },
  { city: "Winston-Salem", county: "Forsyth", state: "North Carolina", state_code: "NC", zip_code: "27101", latitude: 36.0999, longitude: -80.2442, population: 249545, timezone: "America/New_York", region: "Southeast" },
  // North Dakota
  { city: "Fargo", county: "Cass", state: "North Dakota", state_code: "ND", zip_code: "58102", latitude: 46.8772, longitude: -96.7898, population: 125990, timezone: "America/Chicago", region: "Midwest" },
  // Ohio
  { city: "Columbus", county: "Franklin", state: "Ohio", state_code: "OH", zip_code: "43215", latitude: 39.9612, longitude: -82.9988, population: 905748, timezone: "America/New_York", region: "Midwest" },
  { city: "Cleveland", county: "Cuyahoga", state: "Ohio", state_code: "OH", zip_code: "44114", latitude: 41.4993, longitude: -81.6944, population: 372624, timezone: "America/New_York", region: "Midwest" },
  { city: "Cincinnati", county: "Hamilton", state: "Ohio", state_code: "OH", zip_code: "45202", latitude: 39.1031, longitude: -84.512, population: 309317, timezone: "America/New_York", region: "Midwest" },
  { city: "Toledo", county: "Lucas", state: "Ohio", state_code: "OH", zip_code: "43604", latitude: 41.6528, longitude: -83.5379, population: 270871, timezone: "America/New_York", region: "Midwest" },
  { city: "Akron", county: "Summit", state: "Ohio", state_code: "OH", zip_code: "44308", latitude: 41.0814, longitude: -81.519, population: 190469, timezone: "America/New_York", region: "Midwest" },
  { city: "Dayton", county: "Montgomery", state: "Ohio", state_code: "OH", zip_code: "45402", latitude: 39.7589, longitude: -84.1916, population: 137644, timezone: "America/New_York", region: "Midwest" },
  // Oklahoma
  { city: "Oklahoma City", county: "Oklahoma", state: "Oklahoma", state_code: "OK", zip_code: "73102", latitude: 35.4676, longitude: -97.5164, population: 681054, timezone: "America/Chicago", region: "Southwest" },
  { city: "Tulsa", county: "Tulsa", state: "Oklahoma", state_code: "OK", zip_code: "74103", latitude: 36.154, longitude: -95.9928, population: 413066, timezone: "America/Chicago", region: "Southwest" },
  // Oregon
  { city: "Portland", county: "Multnomah", state: "Oregon", state_code: "OR", zip_code: "97204", latitude: 45.5152, longitude: -122.6784, population: 652503, timezone: "America/Los_Angeles", region: "West" },
  { city: "Salem", county: "Marion", state: "Oregon", state_code: "OR", zip_code: "97301", latitude: 44.9429, longitude: -123.0351, population: 175535, timezone: "America/Los_Angeles", region: "West" },
  { city: "Eugene", county: "Lane", state: "Oregon", state_code: "OR", zip_code: "97401", latitude: 44.0521, longitude: -123.0868, population: 176654, timezone: "America/Los_Angeles", region: "West" },
  // Pennsylvania
  { city: "Philadelphia", county: "Philadelphia", state: "Pennsylvania", state_code: "PA", zip_code: "19107", latitude: 39.9526, longitude: -75.1652, population: 1603797, timezone: "America/New_York", region: "Northeast" },
  { city: "Pittsburgh", county: "Allegheny", state: "Pennsylvania", state_code: "PA", zip_code: "15222", latitude: 40.4406, longitude: -79.9959, population: 302971, timezone: "America/New_York", region: "Northeast" },
  { city: "Allentown", county: "Lehigh", state: "Pennsylvania", state_code: "PA", zip_code: "18101", latitude: 40.6084, longitude: -75.4902, population: 126092, timezone: "America/New_York", region: "Northeast" },
  // Rhode Island
  { city: "Providence", county: "Providence", state: "Rhode Island", state_code: "RI", zip_code: "02903", latitude: 41.824, longitude: -71.4128, population: 190934, timezone: "America/New_York", region: "Northeast" },
  // South Carolina
  { city: "Charleston", county: "Charleston", state: "South Carolina", state_code: "SC", zip_code: "29401", latitude: 32.7765, longitude: -79.9311, population: 150227, timezone: "America/New_York", region: "Southeast" },
  { city: "Columbia", county: "Richland", state: "South Carolina", state_code: "SC", zip_code: "29201", latitude: 34.0007, longitude: -81.0348, population: 131674, timezone: "America/New_York", region: "Southeast" },
  // South Dakota
  { city: "Sioux Falls", county: "Minnehaha", state: "South Dakota", state_code: "SD", zip_code: "57104", latitude: 43.5446, longitude: -96.7311, population: 192517, timezone: "America/Chicago", region: "Midwest" },
  // Tennessee
  { city: "Nashville", county: "Davidson", state: "Tennessee", state_code: "TN", zip_code: "37203", latitude: 36.1627, longitude: -86.7816, population: 689447, timezone: "America/Chicago", region: "Southeast" },
  { city: "Memphis", county: "Shelby", state: "Tennessee", state_code: "TN", zip_code: "38103", latitude: 35.1495, longitude: -90.049, population: 633104, timezone: "America/Chicago", region: "Southeast" },
  { city: "Knoxville", county: "Knox", state: "Tennessee", state_code: "TN", zip_code: "37902", latitude: 35.9606, longitude: -83.9207, population: 190740, timezone: "America/New_York", region: "Southeast" },
  { city: "Chattanooga", county: "Hamilton", state: "Tennessee", state_code: "TN", zip_code: "37402", latitude: 35.0456, longitude: -85.3097, population: 181099, timezone: "America/New_York", region: "Southeast" },
  // Texas
  { city: "Houston", county: "Harris", state: "Texas", state_code: "TX", zip_code: "77002", latitude: 29.7604, longitude: -95.3698, population: 2304580, timezone: "America/Chicago", region: "Southwest" },
  { city: "San Antonio", county: "Bexar", state: "Texas", state_code: "TX", zip_code: "78205", latitude: 29.4241, longitude: -98.4936, population: 1547253, timezone: "America/Chicago", region: "Southwest" },
  { city: "Dallas", county: "Dallas", state: "Texas", state_code: "TX", zip_code: "75201", latitude: 32.7767, longitude: -96.797, population: 1304379, timezone: "America/Chicago", region: "Southwest" },
  { city: "Austin", county: "Travis", state: "Texas", state_code: "TX", zip_code: "78701", latitude: 30.2672, longitude: -97.7431, population: 978908, timezone: "America/Chicago", region: "Southwest" },
  { city: "Fort Worth", county: "Tarrant", state: "Texas", state_code: "TX", zip_code: "76102", latitude: 32.7555, longitude: -97.3308, population: 918915, timezone: "America/Chicago", region: "Southwest" },
  { city: "El Paso", county: "El Paso", state: "Texas", state_code: "TX", zip_code: "79901", latitude: 31.7619, longitude: -106.485, population: 681728, timezone: "America/Denver", region: "Southwest" },
  { city: "Arlington", county: "Tarrant", state: "Texas", state_code: "TX", zip_code: "76010", latitude: 32.7357, longitude: -97.1081, population: 394266, timezone: "America/Chicago", region: "Southwest" },
  { city: "Corpus Christi", county: "Nueces", state: "Texas", state_code: "TX", zip_code: "78401", latitude: 27.8006, longitude: -97.3964, population: 317863, timezone: "America/Chicago", region: "Southwest" },
  { city: "Plano", county: "Collin", state: "Texas", state_code: "TX", zip_code: "75024", latitude: 33.0198, longitude: -96.6989, population: 285494, timezone: "America/Chicago", region: "Southwest" },
  { city: "Lubbock", county: "Lubbock", state: "Texas", state_code: "TX", zip_code: "79401", latitude: 33.5779, longitude: -101.8552, population: 263584, timezone: "America/Chicago", region: "Southwest" },
  { city: "Laredo", county: "Webb", state: "Texas", state_code: "TX", zip_code: "78040", latitude: 27.5036, longitude: -99.5076, population: 261639, timezone: "America/Chicago", region: "Southwest" },
  { city: "Irving", county: "Dallas", state: "Texas", state_code: "TX", zip_code: "75060", latitude: 32.8140, longitude: -96.9489, population: 256684, timezone: "America/Chicago", region: "Southwest" },
  // Utah
  { city: "Salt Lake City", county: "Salt Lake", state: "Utah", state_code: "UT", zip_code: "84101", latitude: 40.7608, longitude: -111.891, population: 199723, timezone: "America/Denver", region: "West" },
  { city: "West Valley City", county: "Salt Lake", state: "Utah", state_code: "UT", zip_code: "84120", latitude: 40.6916, longitude: -112.0011, population: 140230, timezone: "America/Denver", region: "West" },
  { city: "Provo", county: "Utah", state: "Utah", state_code: "UT", zip_code: "84601", latitude: 40.2338, longitude: -111.6585, population: 115162, timezone: "America/Denver", region: "West" },
  // Vermont
  { city: "Burlington", county: "Chittenden", state: "Vermont", state_code: "VT", zip_code: "05401", latitude: 44.4759, longitude: -73.2121, population: 44743, timezone: "America/New_York", region: "Northeast" },
  // Virginia
  { city: "Virginia Beach", county: "Virginia Beach", state: "Virginia", state_code: "VA", zip_code: "23451", latitude: 36.8529, longitude: -75.978, population: 459470, timezone: "America/New_York", region: "Southeast" },
  { city: "Norfolk", county: "Norfolk", state: "Virginia", state_code: "VA", zip_code: "23510", latitude: 36.8508, longitude: -76.2859, population: 242742, timezone: "America/New_York", region: "Southeast" },
  { city: "Richmond", county: "Richmond City", state: "Virginia", state_code: "VA", zip_code: "23219", latitude: 37.5407, longitude: -77.436, population: 226610, timezone: "America/New_York", region: "Southeast" },
  { city: "Arlington", county: "Arlington", state: "Virginia", state_code: "VA", zip_code: "22201", latitude: 38.8816, longitude: -77.0910, population: 238643, timezone: "America/New_York", region: "Southeast" },
  // Washington
  { city: "Seattle", county: "King", state: "Washington", state_code: "WA", zip_code: "98101", latitude: 47.6062, longitude: -122.3321, population: 737015, timezone: "America/Los_Angeles", region: "West" },
  { city: "Spokane", county: "Spokane", state: "Washington", state_code: "WA", zip_code: "99201", latitude: 47.6588, longitude: -117.426, population: 228989, timezone: "America/Los_Angeles", region: "West" },
  { city: "Tacoma", county: "Pierce", state: "Washington", state_code: "WA", zip_code: "98402", latitude: 47.2529, longitude: -122.4443, population: 219346, timezone: "America/Los_Angeles", region: "West" },
  { city: "Vancouver", county: "Clark", state: "Washington", state_code: "WA", zip_code: "98660", latitude: 45.6387, longitude: -122.6615, population: 190915, timezone: "America/Los_Angeles", region: "West" },
  // West Virginia
  { city: "Charleston", county: "Kanawha", state: "West Virginia", state_code: "WV", zip_code: "25301", latitude: 38.3498, longitude: -81.6326, population: 46536, timezone: "America/New_York", region: "Southeast" },
  // Wisconsin
  { city: "Milwaukee", county: "Milwaukee", state: "Wisconsin", state_code: "WI", zip_code: "53202", latitude: 43.0389, longitude: -87.9065, population: 577222, timezone: "America/Chicago", region: "Midwest" },
  { city: "Madison", county: "Dane", state: "Wisconsin", state_code: "WI", zip_code: "53703", latitude: 43.0731, longitude: -89.4012, population: 269840, timezone: "America/Chicago", region: "Midwest" },
  { city: "Green Bay", county: "Brown", state: "Wisconsin", state_code: "WI", zip_code: "54301", latitude: 44.5133, longitude: -88.0133, population: 107395, timezone: "America/Chicago", region: "Midwest" },
  // Wyoming
  { city: "Cheyenne", county: "Laramie", state: "Wyoming", state_code: "WY", zip_code: "82001", latitude: 41.14, longitude: -104.8202, population: 65132, timezone: "America/Denver", region: "West" },
  // DC
  { city: "Washington", county: "District of Columbia", state: "District of Columbia", state_code: "DC", zip_code: "20001", latitude: 38.9072, longitude: -77.0369, population: 689545, timezone: "America/New_York", region: "Northeast" },
  // Additional major cities for density
  { city: "Honolulu", county: "Honolulu", state: "Hawaii", state_code: "HI", zip_code: "96815", latitude: 21.2769, longitude: -157.8268, population: 350964, timezone: "Pacific/Honolulu", region: "West" },
  { city: "Chesapeake", county: "Chesapeake", state: "Virginia", state_code: "VA", zip_code: "23320", latitude: 36.7682, longitude: -76.2875, population: 249422, timezone: "America/New_York", region: "Southeast" },
  { city: "Garland", county: "Dallas", state: "Texas", state_code: "TX", zip_code: "75040", latitude: 32.9126, longitude: -96.6389, population: 239928, timezone: "America/Chicago", region: "Southwest" },
  { city: "Hialeah", county: "Miami-Dade", state: "Florida", state_code: "FL", zip_code: "33010", latitude: 25.8576, longitude: -80.2781, population: 223109, timezone: "America/New_York", region: "Southeast" },
  { city: "Fremont", county: "Alameda", state: "California", state_code: "CA", zip_code: "94538", latitude: 37.5485, longitude: -121.9886, population: 230504, timezone: "America/Los_Angeles", region: "West" },
  { city: "Boise", county: "Ada", state: "Idaho", state_code: "ID", zip_code: "83706", latitude: 43.6007, longitude: -116.2317, population: 235684, timezone: "America/Boise", region: "West" },
  { city: "Modesto", county: "Stanislaus", state: "California", state_code: "CA", zip_code: "95354", latitude: 37.6391, longitude: -120.9969, population: 218464, timezone: "America/Los_Angeles", region: "West" },
  { city: "San Bernardino", county: "San Bernardino", state: "California", state_code: "CA", zip_code: "92401", latitude: 34.1083, longitude: -117.2898, population: 222101, timezone: "America/Los_Angeles", region: "West" },
  { city: "Fontana", county: "San Bernardino", state: "California", state_code: "CA", zip_code: "92335", latitude: 34.0922, longitude: -117.4350, population: 214547, timezone: "America/Los_Angeles", region: "West" },
  { city: "Des Moines", county: "Polk", state: "Iowa", state_code: "IA", zip_code: "50316", latitude: 41.5725, longitude: -93.6091, population: 214133, timezone: "America/Chicago", region: "Midwest" },
  { city: "Moreno Valley", county: "Riverside", state: "California", state_code: "CA", zip_code: "92553", latitude: 33.9425, longitude: -117.2297, population: 212477, timezone: "America/Los_Angeles", region: "West" },
  { city: "Glendale", county: "Los Angeles", state: "California", state_code: "CA", zip_code: "91205", latitude: 34.1425, longitude: -118.2551, population: 196543, timezone: "America/Los_Angeles", region: "West" },
  { city: "Oxnard", county: "Ventura", state: "California", state_code: "CA", zip_code: "93030", latitude: 34.1975, longitude: -119.1771, population: 202063, timezone: "America/Los_Angeles", region: "West" },
  { city: "Huntington Beach", county: "Orange", state: "California", state_code: "CA", zip_code: "92648", latitude: 33.6603, longitude: -117.9992, population: 198711, timezone: "America/Los_Angeles", region: "West" },
  { city: "Santa Clarita", county: "Los Angeles", state: "California", state_code: "CA", zip_code: "91355", latitude: 34.3917, longitude: -118.5426, population: 228673, timezone: "America/Los_Angeles", region: "West" },
  { city: "Garden Grove", county: "Orange", state: "California", state_code: "CA", zip_code: "92840", latitude: 33.7739, longitude: -117.9414, population: 172646, timezone: "America/Los_Angeles", region: "West" },
  { city: "Oceanside", county: "San Diego", state: "California", state_code: "CA", zip_code: "92054", latitude: 33.1959, longitude: -117.3795, population: 175691, timezone: "America/Los_Angeles", region: "West" },
  { city: "Rancho Cucamonga", county: "San Bernardino", state: "California", state_code: "CA", zip_code: "91730", latitude: 34.1064, longitude: -117.5931, population: 177603, timezone: "America/Los_Angeles", region: "West" },
  { city: "Ontario", county: "San Bernardino", state: "California", state_code: "CA", zip_code: "91764", latitude: 34.0633, longitude: -117.6509, population: 175265, timezone: "America/Los_Angeles", region: "West" },
  { city: "Elk Grove", county: "Sacramento", state: "California", state_code: "CA", zip_code: "95624", latitude: 38.4088, longitude: -121.3716, population: 176124, timezone: "America/Los_Angeles", region: "West" },
  { city: "Corona", county: "Riverside", state: "California", state_code: "CA", zip_code: "92882", latitude: 33.8753, longitude: -117.5664, population: 157136, timezone: "America/Los_Angeles", region: "West" },
  { city: "Lancaster", county: "Los Angeles", state: "California", state_code: "CA", zip_code: "93534", latitude: 34.6868, longitude: -118.1542, population: 173516, timezone: "America/Los_Angeles", region: "West" },
  { city: "Palmdale", county: "Los Angeles", state: "California", state_code: "CA", zip_code: "93550", latitude: 34.5794, longitude: -118.1165, population: 169450, timezone: "America/Los_Angeles", region: "West" },
  { city: "Salinas", county: "Monterey", state: "California", state_code: "CA", zip_code: "93901", latitude: 36.6777, longitude: -121.6555, population: 163542, timezone: "America/Los_Angeles", region: "West" },
  { city: "Pomona", county: "Los Angeles", state: "California", state_code: "CA", zip_code: "91766", latitude: 34.0551, longitude: -117.7500, population: 151348, timezone: "America/Los_Angeles", region: "West" },
  { city: "Escondido", county: "San Diego", state: "California", state_code: "CA", zip_code: "92025", latitude: 33.1192, longitude: -117.0864, population: 151038, timezone: "America/Los_Angeles", region: "West" },
  { city: "Roseville", county: "Placer", state: "California", state_code: "CA", zip_code: "95661", latitude: 38.7521, longitude: -121.2880, population: 147773, timezone: "America/Los_Angeles", region: "West" },
  { city: "Surprise", county: "Maricopa", state: "Arizona", state_code: "AZ", zip_code: "85374", latitude: 33.6292, longitude: -112.3680, population: 143148, timezone: "America/Phoenix", region: "Southwest" },
  { city: "Peoria", county: "Maricopa", state: "Arizona", state_code: "AZ", zip_code: "85345", latitude: 33.5806, longitude: -112.2374, population: 190985, timezone: "America/Phoenix", region: "Southwest" },
  { city: "McKinney", county: "Collin", state: "Texas", state_code: "TX", zip_code: "75069", latitude: 33.1972, longitude: -96.6398, population: 195802, timezone: "America/Chicago", region: "Southwest" },
  { city: "Frisco", county: "Collin", state: "Texas", state_code: "TX", zip_code: "75034", latitude: 33.1507, longitude: -96.8236, population: 200509, timezone: "America/Chicago", region: "Southwest" },
  { city: "Clarksville", county: "Montgomery", state: "Tennessee", state_code: "TN", zip_code: "37040", latitude: 36.5298, longitude: -87.3595, population: 166722, timezone: "America/Chicago", region: "Southeast" },
  { city: "Murfreesboro", county: "Rutherford", state: "Tennessee", state_code: "TN", zip_code: "37130", latitude: 35.8456, longitude: -86.3903, population: 152769, timezone: "America/Chicago", region: "Southeast" },
  { city: "Brownsville", county: "Cameron", state: "Texas", state_code: "TX", zip_code: "78520", latitude: 25.9017, longitude: -97.4975, population: 186738, timezone: "America/Chicago", region: "Southwest" },
  { city: "Killeen", county: "Bell", state: "Texas", state_code: "TX", zip_code: "76541", latitude: 31.1171, longitude: -97.7278, population: 153095, timezone: "America/Chicago", region: "Southwest" },
  { city: "McAllen", county: "Hidalgo", state: "Texas", state_code: "TX", zip_code: "78501", latitude: 26.2034, longitude: -98.2300, population: 142210, timezone: "America/Chicago", region: "Southwest" },
  { city: "Midland", county: "Midland", state: "Texas", state_code: "TX", zip_code: "79701", latitude: 31.9973, longitude: -102.0779, population: 146038, timezone: "America/Chicago", region: "Southwest" },
  { city: "Amarillo", county: "Potter", state: "Texas", state_code: "TX", zip_code: "79101", latitude: 35.2220, longitude: -101.8313, population: 199826, timezone: "America/Chicago", region: "Southwest" },
  { city: "Beaumont", county: "Jefferson", state: "Texas", state_code: "TX", zip_code: "77701", latitude: 30.0802, longitude: -94.1266, population: 115282, timezone: "America/Chicago", region: "Southwest" },
  { city: "Round Rock", county: "Williamson", state: "Texas", state_code: "TX", zip_code: "78664", latitude: 30.5083, longitude: -97.6789, population: 133372, timezone: "America/Chicago", region: "Southwest" },
  { city: "Pasadena", county: "Harris", state: "Texas", state_code: "TX", zip_code: "77506", latitude: 29.6911, longitude: -95.2091, population: 151950, timezone: "America/Chicago", region: "Southwest" },
  { city: "Mesquite", county: "Dallas", state: "Texas", state_code: "TX", zip_code: "75149", latitude: 32.7668, longitude: -96.5992, population: 140937, timezone: "America/Chicago", region: "Southwest" },
  { city: "Denton", county: "Denton", state: "Texas", state_code: "TX", zip_code: "76201", latitude: 33.2148, longitude: -97.1331, population: 139869, timezone: "America/Chicago", region: "Southwest" },
  { city: "Waco", county: "McLennan", state: "Texas", state_code: "TX", zip_code: "76701", latitude: 31.5493, longitude: -97.1467, population: 138486, timezone: "America/Chicago", region: "Southwest" },
  { city: "Carrollton", county: "Dallas", state: "Texas", state_code: "TX", zip_code: "75006", latitude: 32.9537, longitude: -96.8903, population: 133434, timezone: "America/Chicago", region: "Southwest" },
  { city: "North Las Vegas", county: "Clark", state: "Nevada", state_code: "NV", zip_code: "89030", latitude: 36.1989, longitude: -115.1175, population: 262527, timezone: "America/Los_Angeles", region: "West" },
  { city: "Chandler", county: "Maricopa", state: "Arizona", state_code: "AZ", zip_code: "85286", latitude: 33.2815, longitude: -111.8520, population: 275987, timezone: "America/Phoenix", region: "Southwest" },
  { city: "Cape Coral", county: "Lee", state: "Florida", state_code: "FL", zip_code: "33904", latitude: 26.5629, longitude: -81.9495, population: 204510, timezone: "America/New_York", region: "Southeast" },
  { city: "Port St. Lucie", county: "St. Lucie", state: "Florida", state_code: "FL", zip_code: "34952", latitude: 27.2730, longitude: -80.3582, population: 204851, timezone: "America/New_York", region: "Southeast" },
  { city: "Pembroke Pines", county: "Broward", state: "Florida", state_code: "FL", zip_code: "33024", latitude: 26.0129, longitude: -80.2241, population: 171178, timezone: "America/New_York", region: "Southeast" },
  { city: "Hollywood", county: "Broward", state: "Florida", state_code: "FL", zip_code: "33019", latitude: 26.0112, longitude: -80.1495, population: 154823, timezone: "America/New_York", region: "Southeast" },
  { city: "Miramar", county: "Broward", state: "Florida", state_code: "FL", zip_code: "33025", latitude: 25.9860, longitude: -80.2323, population: 140823, timezone: "America/New_York", region: "Southeast" },
  { city: "Gainesville", county: "Alachua", state: "Florida", state_code: "FL", zip_code: "32601", latitude: 29.6516, longitude: -82.3248, population: 141085, timezone: "America/New_York", region: "Southeast" },
  { city: "Coral Springs", county: "Broward", state: "Florida", state_code: "FL", zip_code: "33065", latitude: 26.2712, longitude: -80.2706, population: 134394, timezone: "America/New_York", region: "Southeast" },
  { city: "Lakeland", county: "Polk", state: "Florida", state_code: "FL", zip_code: "33801", latitude: 28.0395, longitude: -81.9498, population: 112641, timezone: "America/New_York", region: "Southeast" },
  { city: "Clearwater", county: "Pinellas", state: "Florida", state_code: "FL", zip_code: "33755", latitude: 27.9659, longitude: -82.8001, population: 117260, timezone: "America/New_York", region: "Southeast" },
  { city: "Palm Bay", county: "Brevard", state: "Florida", state_code: "FL", zip_code: "32905", latitude: 28.0345, longitude: -80.5887, population: 119760, timezone: "America/New_York", region: "Southeast" },
  { city: "Pompano Beach", county: "Broward", state: "Florida", state_code: "FL", zip_code: "33060", latitude: 26.2379, longitude: -80.1248, population: 112046, timezone: "America/New_York", region: "Southeast" },
  { city: "West Palm Beach", county: "Palm Beach", state: "Florida", state_code: "FL", zip_code: "33401", latitude: 26.7153, longitude: -80.0534, population: 117415, timezone: "America/New_York", region: "Southeast" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check if already seeded
    const { count } = await supabase.from("locations").select("id", { count: "exact", head: true });
    if (count && count > 50) {
      return new Response(JSON.stringify({ message: "Already seeded", count }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate by city+state_code
    const seen = new Set<string>();
    const unique = US_CITIES.filter((c) => {
      const key = `${c.city}-${c.state_code}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Insert in batches of 50
    let inserted = 0;
    for (let i = 0; i < unique.length; i += 50) {
      const batch = unique.slice(i, i + 50).map((c) => ({
        city: c.city,
        county: c.county,
        state: c.state,
        state_code: c.state_code,
        zip_code: c.zip_code,
        country: "United States",
        country_code: "US",
        latitude: c.latitude,
        longitude: c.longitude,
        population: c.population,
        timezone: c.timezone,
        region: c.region,
      }));
      const { error } = await supabase.from("locations").insert(batch);
      if (error) throw error;
      inserted += batch.length;
    }

    return new Response(JSON.stringify({ message: "Seeded successfully", inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
