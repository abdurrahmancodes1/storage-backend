local currentKey = KEYS[1]
local previousKey = KEYS[2]

local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local elapsed = tonumber(ARGV[3])

local previousCount = redis.call("GET", previousKey)

if previousCount == false then
    previousCount = 0
else
    previousCount = tonumber(previousCount)
end

local currentCount = tonumber(redis.call("GET", currentKey)) or 0

local previousWeight = (window - elapsed) / window
local estimatedCount = previousCount * previousWeight + currentCount + 1

if estimatedCount > limit then
    return -1
end

currentCount = redis.call("INCR", currentKey)

if currentCount == 1 then
    redis.call("EXPIRE", currentKey, 2 * window)
end

return currentCount
