defmodule AstrupWeb.Hooks.LocaleHook do
  use AstrupWeb, :live_view

  def on_mount(:default, _params, %{"locale" => locale}, socket) do
    if is_nil(locale) do
      raise "Locale not found in session"
    end

    Gettext.put_locale(AstrupWeb.Gettext, locale)

    {:cont, assign(socket, :locale, locale)}
  end
end
