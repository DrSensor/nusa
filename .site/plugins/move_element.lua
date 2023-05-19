-- Move specific element to other element
--
-- [widgets.move-script]
-- widget = "move_element"
-- selector = "body style"     # select element to move
-- except = "template style"   # except element matching this selector
-- placement = "head"          # move selected element here
-- move_one = true             # move only the first element matching a selector
-- action = "prepend_child"    # how it move into the placement
--
-- Author: Fahmi Akbar Wildana
-- License: MIT

selectors = config["selector"]
if selectors == nil then Plugin.fail("selector must be either string or list of string") end
if not Value.is_list(selectors) then selectors = { selectors } end

-- BUG(soupault-toml-to-lua-ml): it parse `false` as non-existent which make Table.has_key() return `false`
-- move_all = Table.get_key_default(config, "move_all", "true") -- BUG(lua-ml): doesn't know boolean type
move_one = config["move_one"]

placement = config["placement"]
action = config["action"]
if not action then action = "append_child" end

excludes = config["except"]
if excludes and not Value.is_list(excludes) then
  excludes = { excludes }
end

target = HTML.select_one(page, placement)
if move_one then
  elements = { HTML.select_any_of(page, selectors) }
else
  elements = HTML.select_all_of(page, selectors)
end
index = 1; while elements[index] do
  local element = elements[index]
  if not (excludes and HTML.matches_any_of_selectors(page, element, excludes)) then
    HTML.delete(element)
    HTML[action](target, element)
  end
  index = index + 1
end
