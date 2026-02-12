-- Add plate calculator settings column
ALTER TABLE user_settings
ADD COLUMN plate_calculator JSONB NOT NULL DEFAULT '{
  "selectedBarbell": "olympic",
  "customBarbellWeightKg": 20,
  "customBarbellWeightLbs": 45,
  "availablePlatesKg": [
    {"weight": 25, "available": true},
    {"weight": 20, "available": true},
    {"weight": 15, "available": true},
    {"weight": 10, "available": true},
    {"weight": 5, "available": true},
    {"weight": 2.5, "available": true},
    {"weight": 1.25, "available": true}
  ],
  "availablePlatesLbs": [
    {"weight": 45, "available": true},
    {"weight": 35, "available": true},
    {"weight": 25, "available": true},
    {"weight": 10, "available": true},
    {"weight": 5, "available": true},
    {"weight": 2.5, "available": true}
  ]
}'::jsonb;
