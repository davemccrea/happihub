defmodule AstrupWeb.Hooks.LocaleHook do
  def on_mount(:default, _params, session, socket) do
    if is_nil(session["locale"]) do
      raise "Locale not found in session"
    end

    Gettext.put_locale(AstrupWeb.Gettext, session["locale"])

    {:cont, socket}
  end
end
