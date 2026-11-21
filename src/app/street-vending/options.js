// Keep in sync with streetvendorsApp/lib/data/form_options.dart
// Keys of LOOKUP_CODE are column names; values are the lookup codes the app
// uses as keys in `other_text` (free text typed for an "Other" option).

export const CDN_BASE = 'https://cdn.omgauamrit.in/'
export const mediaUrl = path => (path ? `${CDN_BASE}${path}` : null)

export const STATUS_LABELS = { draft: 'Draft', submitted: 'Submitted', idIssued: 'ID Card Issued' }

export const OPTIONS = {
  area_type: ['Residential', 'Commercial area/Natural Market', 'School/College Area', 'Religious site', 'Garden/Open space', 'Railway Station', 'Industrial area', 'Public place or Government Office', 'Heritage site', 'Highway', 'Bus Stand', 'Hospital', 'Other'],
  place_of_business: ['Main road/Lane/Chowk', 'Footpath', 'Service Area/Road', 'Open Plot Within Premises', 'On Closed Drainage Line', 'Private Property/Plot', 'Other'],
  nature_of_business: ['Fast food items and drinks', 'Fruits and Vegetables', 'Readymade Garments (Old and new)', 'Footwear and leather goods', 'Ceramic Products/Plastic products', 'Cutlery and Utensils', 'Jewellery', 'Accessories (bags, watches, wallets, belts, hair & mobile accessories etc.)', 'Cosmetic products', 'Books and newspapers', 'CDs/DVDs', 'Lottery tickets', 'Flowers vendor', 'Stationary products', 'Paan/Cigarette/Beedi/Tobacco products', 'Sea food vendor', 'Dairy and poultry products', 'Bakery products', 'Pooja products', 'Miscellaneous', 'Services Providers', 'Others'],
  service_provider_type: ['Cobbler', 'Barber', 'Tailor', 'Repairs automobiles', 'Mechanical work', 'Dhobi', 'Painter', 'Chabbiwala', 'Kabaddiwala', 'Others'],
  guardian_relation: ['Son of', 'Daughter of', 'Wife of'],
  gender: ['Male', 'Female', 'Transgender'],
  nationality: ['Indian', 'Other'],
  category: ['General', 'Scheduled Caste (SC)', 'Scheduled Tribe (ST)', 'Other Backward Class (OBC)', 'Other'],
  marital_status: ['Married', 'Unmarried', 'Widow/Widower', 'Divorced', 'Separated'],
  education: ['Illiterate', 'Primary (1-5)', 'Middle School (6-8)', 'Secondary (9-10)', 'Senior Secondary (11-12)', 'Diploma', 'Graduate', 'Post Graduate', 'Other'],
  disability: ['None', 'Visually Impaired', 'Deaf', 'Dumb', 'Disabled by hand/leg', 'Mentally Challenged', 'Other'],
  migration: ['Belong to this city', 'Have migrated'],
  residential_proofs: ['None', 'Voter Card', 'Ration Card', 'Aadhaar Card', 'APL/BPL Card', 'Electricity Bill', 'Municipal Tax Bill', 'Other'],
  relation: ['Husband', 'Wife', 'Son', 'Daughter', 'Brother', 'Sister', 'Mother', 'Father', 'Others'],
  license: ['None', 'Mobile License', 'Stationary License', 'Cabin License', 'Other'],
  vending_frequency: ['Daily', 'One to two days per week', 'More than two days per week', 'Fortnightly', 'Monthly', 'Seasonal', 'Not fixed'],
  business_type: ['Mobile', 'Stationary', 'Both'],
  structure_type: ['Kachha', 'Pakka', 'Semi-Pakka'],
  vehicle_type: ['Tempo', 'Auto Van', 'Handcart', 'Bicycle', 'Bullock cart', 'Other'],
  vehicle_ownership: ['Self', 'Family', 'On rent', 'Partnership', 'Other'],
  satisfied_reasons: ['The place is near your house', 'Good relations with the people in this area', 'No local interference', 'Crowded place', 'Good locality', 'Well known market', 'Convenient for customers', 'Near office or education institution', 'Other'],
  unsatisfied_reasons: ['Less income', 'Unsuitable for health and business', 'Local people object against the business', 'Interference by employees of Municipal Corporation', 'Other illegal business around', 'Problems created by Police Department', 'Transportation problem', 'Other'],
  employees_count: ['None', '1', '2', 'Others'],
  employee_wage_type: ['Daily Wages', 'Weekly', 'Monthly'],
  rent_paid_to: ['Civic Body', 'Nearby shopkeeper', 'Owner of the place', 'Other'],
  rent_payment_type: ['Daily', 'Weekly', 'Monthly', 'Other'],
  purchase_source: ['Manufacturer', 'Wholesale market', 'Distributor', 'Other'],
  seed_money_source: ['Own money', 'From Banks', 'Credit Societies', 'Other Sources'],
  raw_material_frequency: ['Not applicable', 'Daily', 'Weekly', 'Monthly', 'Other'],
  favourite_time: ['Morning', 'Noon time', 'Evening'],
  market_type: ['Natural Market (Daily Market)', 'Evening/Night Market', 'Holiday Market', 'Weekly Market', 'Festival Market', 'Other'],
  garbage_disposal: ['Municipal bins', 'Private bins', 'On road/street', 'Dump it in a water body', 'Through door to door collection', 'Other'],
  storage_access: ['Yes', 'No', 'Not Applicable'],
  light_source: ['None', 'Street Light', 'Gas/Oil Lamp', 'Battery Operated', 'Solar Light', 'Generator', 'Paid Electricity Connection', 'Other'],
  desired_facilities: ['Different market', 'Water', 'Electricity', 'Common Toilet', 'Common lighting facility', 'Waste dispose facility', 'Security', 'A cleaning person', 'Parking', 'Labour for parking and transport management', 'Other'],
  vending_activity: ['Clothes', 'Electronic', 'Flowers', 'Household articles', 'Non-processed food', 'Processed food', 'Service providers', 'Stationary'],
  vending_mode: ['Movable', 'Stationary'],
  status: ['draft', 'submitted', 'idIssued'],
}
OPTIONS.other_vendor_relation = OPTIONS.relation

export const LOOKUP_CODE = {
  area_type: 'AREA_TYPE',
  place_of_business: 'PLACE_OF_BUSINESS',
  nature_of_business: 'NATURE_OF_BUSINESS',
  service_provider_type: 'SERVICE_PROVIDER_TYPE',
  guardian_relation: 'GUARDIAN_RELATION',
  gender: 'GENDER',
  nationality: 'NATIONALITY',
  category: 'SOCIAL_CATEGORY',
  marital_status: 'MARITAL_STATUS',
  education: 'EDUCATION_LEVEL',
  disability: 'DISABILITY',
  migration: 'MIGRATION',
  residential_proofs: 'RESIDENTIAL_PROOF',
  other_vendor_relation: 'RELATION',
  license: 'VENDING_LICENSE',
  vending_frequency: 'VENDING_FREQUENCY',
  business_type: 'BUSINESS_TYPE',
  structure_type: 'STRUCTURE_TYPE',
  vehicle_type: 'VEHICLE_TYPE',
  vehicle_ownership: 'VEHICLE_OWNERSHIP',
  satisfied_reasons: 'LOCATION_SATISFIED_REASON',
  unsatisfied_reasons: 'LOCATION_UNSATISFIED_REASON',
  employees_count: 'EMPLOYEES_COUNT',
  employee_wage_type: 'EMPLOYEE_WAGE_TYPE',
  rent_paid_to: 'RENT_PAID_TO',
  rent_payment_type: 'PAYMENT_FREQUENCY',
  purchase_source: 'PURCHASE_SOURCE',
  seed_money_source: 'SEED_MONEY_SOURCE',
  raw_material_frequency: 'RAW_MATERIAL_FREQUENCY',
  favourite_time: 'FAVOURITE_TIME',
  market_type: 'MARKET_TYPE',
  garbage_disposal: 'GARBAGE_DISPOSAL',
  storage_access: 'STORAGE_ACCESS',
  light_source: 'LIGHT_SOURCE',
  desired_facilities: 'DESIRED_FACILITY',
  vending_activity: 'VENDING_ACTIVITY',
  vending_mode: 'VENDING_MODE',
}

/** Field kinds: text (default), textarea, int, num, bool, select, multi, date, time, readonly. */
export const FIELDS = {
  municipality_name: ['Municipal Corporation / Council / Committee'],
  zone_name: ['Zone'],
  ward_name: ['6. Ward Name'],
  street_name: ['7. Street Name'],
  landmark: ['8. Nearby Landmark'],
  area_type: ['9. Type of area', 'select'],
  place_of_business: ['10. Place of Business', 'select'],
  nature_of_business: ['11. Nature of Business', 'select'],
  service_provider_type: ['12. If Service Provider, nature of business', 'select'],
  vending_place_name: ['13. Name of Vending Place'],

  first_name: ['14. First Name'],
  middle_name: ['15. Middle Name'],
  surname: ['16. Surname'],
  guardian_relation: ['Relation (for Form II)', 'select'],
  guardian_name: ['Father / Husband Name (Sh.)'],
  house_no: ['House No.'],
  residential_address: ['17. Residential Address', 'textarea'],
  colony_sector: ['Colony / Sector'],
  block: ['18. Block'],
  city: ['19. City / Town'],
  district: ['20. District'],
  permanent_address: ['Permanent Address', 'textarea'],
  mobile_no: ['21. Mobile No.'],
  phone_no: ['22. Phone No.'],
  age: ['23. Age', 'int'],
  gender: ['24. Gender', 'select'],
  nationality: ['25. Nationality', 'select'],
  category: ['26. Category', 'select'],
  has_caste_certificate: ['27. SC/ST/OBC certificate?', 'bool'],
  marital_status: ['28. Marital Status', 'select'],
  education: ['29. Education', 'select'],
  disability: ['30. Disability', 'select'],
  has_disability_certificate: ['31. Disability certificate?', 'bool'],
  disability_certificate_no: ['32. Certificate No.'],
  bpl_card_no: ['33. BPL Card No.'],
  migration: ['34-35. Migration', 'select'],
  native_district: ['36. Native place district'],
  years_in_city: ['37. Years living in this city', 'int'],
  residential_proofs: ['38. Residential proof possessed', 'multi'],

  male_members: ['39. Family members - Male', 'int'],
  female_members: ['40. Family members - Female', 'int'],
  children: ['41. Children below 14', 'int'],
  earning_male: ['42. Earning members - Male', 'int'],
  earning_female: ['43-44. Earning members - Female', 'int'],
  other_vendor_in_house: ['45. Anyone else in house a street vendor?', 'bool'],
  other_vendor_relation: ['46. Relation with you', 'select'],
  other_vendor_name: ['47. Full name of member'],

  other_income: ['48. Other source of income?', 'bool'],
  previous_work: ['49. Work before street vending'],
  previous_city: ['50. City worked in before'],
  years_in_vending: ['51. Years in street vending', 'int'],
  years_in_area: ['52. Years in this area', 'int'],
  license: ['53. License for street vending', 'select'],
  vending_frequency: ['54. How often vending', 'select'],
  business_type: ['55. Type of Business', 'select'],
  distance_to_place_km: ['56. Distance to this place (km)', 'num'],
  hours_per_day: ['57. Hours worked per day', 'num'],
  vending_from: ['58. Vending from', 'time'],
  vending_to: ['58. Vending to', 'time'],
  km_per_day_mobile: ['59. KM travelled per day', 'num'],
  structure_type: ['60. Type of structure', 'select'],
  land_space_sqft: ['61. Land space used (sq.ft.)', 'num'],
  uses_vehicle: ['62. Uses vehicle for vending?', 'bool'],
  vehicle_type: ['63. Vehicle used', 'select'],
  vehicle_ownership: ['64. Ownership of vehicle', 'select'],
  vehicle_rent: ['65. Vehicle rent (₹)', 'num'],
  months_per_year: ['66. Months worked in a year', 'int'],
  same_work_mostly: ['67. Same work mostly?', 'bool'],
  satisfied_with_location: ['68. Satisfied with location?', 'bool'],
  satisfied_reasons: ['69. If yes, why?', 'multi'],
  unsatisfied_reasons: ['70. If no, why?', 'multi'],

  employees_count: ['71. People employed', 'select'],
  employee_wage_type: ['72. Employment basis', 'select'],
  avg_employee_pay: ['73. Avg. pay to employees (₹)', 'num'],
  pays_rent: ['74. Pays rent for vending place?', 'bool'],
  rent_paid_to: ['75. Rent paid to', 'select'],
  rent_payment_type: ['76. Type of payment', 'select'],
  rent_amount: ['77. Amount of payment (₹)', 'num'],
  purchase_source: ['78. Where goods are purchased', 'select'],
  seed_money_source: ['79. Source of seed money', 'select'],
  raw_material_frequency: ['80. Raw material purchase frequency', 'select'],
  daily_purchase: ['81. Daily purchase (₹)', 'num'],
  daily_sales: ['82. Daily sales (₹)', 'num'],
  daily_profit: ['83. Daily profit (₹)', 'num'],
  has_loan: ['84. Taken any loan?', 'bool'],
  loan_amount: ['85. Loan amount (₹)', 'num'],
  has_savings_account: ['86. Savings account?', 'bool'],
  bank_name: ['87. Name of Bank'],
  has_insurance: ['88. Any insurance?', 'bool'],
  insurance_details: ['89. Insurance details'],
  uses_social_security: ['90. Social security scheme benefit?', 'bool'],
  social_security_scheme: ['91. Name of the scheme'],

  satisfied_with_work: ['92. Satisfied with work?', 'bool'],
  ready_to_shift: ['93. Ready to shift to allocated area?', 'bool'],
  need_covered_market: ['94. Need covered market space?', 'bool'],
  need_open_space: ['95. Need uncovered open space?', 'bool'],
  union_member: ['96. Member of vendor union?', 'bool'],
  union_name: ['97. Name of organization'],
  aware_of_act: ['98. Aware of Street Vendors Act, 2014?', 'bool'],
  interested_in_license: ['99. Interested in license?', 'bool'],
  favourite_time: ['100. Favourite time for business', 'select'],
  market_type: ['101. Kind of market', 'select'],
  drinking_water: ['102. Free drinking water nearby?', 'bool'],
  toilet_access: ['103. Toilet facility nearby?', 'bool'],
  garbage_disposal: ['104. Garbage disposal', 'select'],
  storage_access: ['105. Storage facility?', 'select'],
  light_source: ['106. Light source', 'select'],
  aware_of_traffic_problem: ['107. Aware of traffic problems?', 'bool'],
  traffic_solution: ['108. Solution', 'textarea'],
  desired_facilities: ['109-110. Facilities desired', 'multi'],
  vendor_remarks: ['111. Vendor remarks', 'textarea'],
  surveyor_note: ["112. Surveyor's Note", 'textarea'],

  application_no: ['Application No.', 'readonly'],
  application_date: ['Application Date', 'date'],
  application_place: ['Place (where signed)'],
  vending_activity: ['Vending activity', 'select'],
  vending_mode: ['Vending as', 'select'],
  id_card_no: ['ID Card No.', 'readonly'],
  id_valid_from: ['ID valid from', 'date'],
  id_valid_to: ['ID valid to', 'date'],
  status: ['Status', 'select'],

  id: ['Record ID', 'readonly'],
  created_by_name: ['Surveyor', 'readonly'],
  created_at: ['Created At', 'readonly'],
  updated_by_name: ['Last Updated By', 'readonly'],
  updated_at: ['Last Updated', 'readonly'],
}

export const SECTIONS = [
  { title: 'Vending Location (Q6-Q13)', fields: ['municipality_name', 'zone_name', 'ward_name', 'street_name', 'landmark', 'area_type', 'place_of_business', 'nature_of_business', 'service_provider_type', 'vending_place_name'] },
  { title: 'Vendor Name & Address (Q14-Q22)', fields: ['first_name', 'middle_name', 'surname', 'guardian_relation', 'guardian_name', 'house_no', 'residential_address', 'colony_sector', 'block', 'city', 'district', 'permanent_address', 'mobile_no', 'phone_no'] },
  { title: 'Personal Information (Q23-Q38)', fields: ['age', 'gender', 'nationality', 'category', 'has_caste_certificate', 'marital_status', 'education', 'disability', 'has_disability_certificate', 'disability_certificate_no', 'bpl_card_no', 'migration', 'native_district', 'years_in_city', 'residential_proofs'] },
  { title: 'Household (Q39-Q47)', fields: ['male_members', 'female_members', 'children', 'earning_male', 'earning_female', 'other_vendor_in_house', 'other_vendor_relation', 'other_vendor_name'], family: true },
  { title: 'Business Details (Q48-Q70)', fields: ['other_income', 'previous_work', 'previous_city', 'years_in_vending', 'years_in_area', 'license', 'vending_frequency', 'business_type', 'distance_to_place_km', 'hours_per_day', 'vending_from', 'vending_to', 'km_per_day_mobile', 'structure_type', 'land_space_sqft', 'uses_vehicle', 'vehicle_type', 'vehicle_ownership', 'vehicle_rent', 'months_per_year', 'same_work_mostly', 'satisfied_with_location', 'satisfied_reasons', 'unsatisfied_reasons'] },
  { title: 'Employment & Finance (Q71-Q91)', fields: ['employees_count', 'employee_wage_type', 'avg_employee_pay', 'pays_rent', 'rent_paid_to', 'rent_payment_type', 'rent_amount', 'purchase_source', 'seed_money_source', 'raw_material_frequency', 'daily_purchase', 'daily_sales', 'daily_profit', 'has_loan', 'loan_amount', 'has_savings_account', 'bank_name', 'has_insurance', 'insurance_details', 'uses_social_security', 'social_security_scheme'] },
  { title: 'Facilities & Opinion (Q92-Q112)', fields: ['satisfied_with_work', 'ready_to_shift', 'need_covered_market', 'need_open_space', 'union_member', 'union_name', 'aware_of_act', 'interested_in_license', 'favourite_time', 'market_type', 'drinking_water', 'toilet_access', 'garbage_disposal', 'storage_access', 'light_source', 'aware_of_traffic_problem', 'traffic_solution', 'desired_facilities', 'vendor_remarks', 'surveyor_note'] },
  { title: 'Application (Form II) & ID Card (Form III)', fields: ['vending_activity', 'vending_mode', 'application_place', 'application_no', 'application_date', 'id_card_no', 'id_valid_from', 'id_valid_to', 'status'] },
  { title: 'System', fields: ['id', 'created_by_name', 'created_at', 'updated_by_name', 'updated_at'] },
]

/** [column, label, kind] kind: image | video */
export const MEDIA = [
  ['photo_with_location', '1. Vendor with Location', 'image'],
  ['photo_with_thela', '2. Vendor with Thela / Vending Place', 'image'],
  ['id_proof_1', '3. Identity Proof-1', 'image'],
  ['id_proof_2', '4. Identity Proof-2', 'image'],
  ['video', '5. Video of vendor & vending place', 'video'],
  ['passport_photo', 'Passport size photograph', 'image'],
  ['signature', 'Signature of applicant', 'image'],
]

// ---------- helpers shared by list / edit / print pages ----------

export const fullName = v => [v.first_name, v.middle_name, v.surname].filter(s => s && String(s).trim()).join(' ')

/** "Other" option replaced with the text the surveyor typed. */
export function display(v, column) {
  const value = v[column]
  if (!value) return ''
  const other = v.other_text?.[LOOKUP_CODE[column]]
  if (String(value).startsWith('Other') && other) return other
  return value
}

export const localAddressLine = v => [
  v.house_no ? `H.No. ${v.house_no}` : '',
  v.residential_address, v.colony_sector, v.block, v.city, v.district,
].filter(s => s && String(s).trim()).join(', ')

export function formatDate(value) {
  if (!value) return ''
  const s = String(value).slice(0, 10)
  const [y, m, d] = s.split('-')
  return y && m && d ? `${d}/${m}/${y}` : s
}
