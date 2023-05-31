-- Scan <render-scope> and render their sources into tablist or whatever
--
-- Author: Fahmi Akbar Wildana
-- License: MIT

insert_at = config["selector"]
if insert_at and not Value.is_list(insert_at) then
  insert_at = { insert_at }
end

to_remove = config["delete"]
if to_remove and not Value.is_list(to_remove) then
  to_remove = { to_remove }
end

hash_command = config["hash_command"]
template = config["render_template"]

action = config["action"]
if not action then action = "append_child" end

if (not insert_at) or (not template) then
  Plugin.fail('Both "selector" and "render_template" options must be configured')
end

--------------------- end of config ---------------------

target = HTML.select_any_of(page, insert_at)
page_dir = Sys.dirname(page_file)

files = {} -- to prevent duplicates
sources = {}; sources_length = 0
function sources_add(path)
  local relpath = Sys.basename(path)
  if String.starts_with(path, "../") then
    relpath = path
  end

  if files[relpath] then return end
  Log.info("[nusa] Add " .. path .. " into sources")
  files[relpath] = 1

  local content
  if path == page_file then
    content = Sys.read_file(path)
    content = Regex.replace_all(content, ":", "﹕") -- BUG(lambdasoup): they still assume colon is XML namespace
    local page_origin = HTML.parse(content)
    if to_remove then
      local remove_at = HTML.select_all_of(page_origin, to_remove)
      index = 1; while remove_at[index] do
        HTML.delete(remove_at[index])
        index = index + 1
      end
    end
    content = HTML.to_string(page_origin)                          -- contain trailing newlines with indentation
    content = Regex.replace_all(content, "([ \t]*\n){3,}", "\n\n") -- cleanup ☝
    content = Regex.replace_all(content, '=""', "")                -- attribute without value
    content = Regex.replace_all(content, "﹕", ":")               -- BUG(lambdasoup): they still assume colon is XML namespace
  else
    path = Sys.join_path(page_dir, path)
    content = Sys.read_file(path)
  end

  local source = {
    path = path,
    file = relpath,
    lang = Sys.get_extension(path), -- BUG(soupault): it throw Error if path starts_with ../
    content = String.trim(content)
  }
  if hash_command then
    source["hash"] = Sys.get_program_output(hash_command, content)
  end
  sources_length = sources_length + 1
  sources[sources_length] = source
end

sources_add(page_file)

links = HTML.select(page, "render-scope > link[href]")
index = 1; while links[index] do
  local path = HTML.get_attribute(links[index], "href")
  sources_add(path)
  index = index + 1
end

-- TODO: also register and handle importmap "scopes"
importmap = JSON.from_string(HTML.strip_tags(HTML.select_one(page, "script[type=importmap]")))
packages = importmap["imports"]

hoistmaps = HTML.select(page, "render-scope > script[type=hoistmap]")
index = 1; while hoistmaps[index] do
  local hoistmap = JSON.from_string(HTML.strip_tags(hoistmaps[index]))
  local ES_dependencies = hoistmap["imports"]
  index_ = 1; while ES_dependencies[index_] do
    local dependency = ES_dependencies[index_]
    if not Table.has_key(packages, dependency) then
      sources_add(dependency)
    end
    index_ = index_ + 1
  end
  index = index + 1
end

HTML[action](target, HTML.parse(String.trim(String.render_template(template, { sources = sources }))))
