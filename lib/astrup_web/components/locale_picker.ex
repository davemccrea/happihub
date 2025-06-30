defmodule AstrupWeb.Components.LocalePicker do
  use AstrupWeb, :live_component

  def render(assigns) do
    locale_info = %{
      "en" => "English",
      "sv" => "Svenska",
      "fi" => "Suomi"
    }

    assigns =
      assigns
      |> assign(:locale_info, locale_info)

    ~H"""
    <div class="dropdown dropdown-end">
      <div
        tabindex="0"
        role="button"
        class="btn btn-ghost btn-sm"
        aria-label={gettext("Change language")}
        aria-haspopup="true"
      >
        <.icon name="hero-globe-alt" class="size-4" />
        <span class="text-sm">{@locale |> String.upcase()}</span>
      </div>
      <ul
        tabindex="0"
        class="dropdown-content menu bg-base-100 rounded-box z-[1] w-48 p-2 shadow"
        role="menu"
        aria-label={gettext("Available languages")}
      >
        <li :for={{locale, name} <- @locale_info}>
          <button
            phx-click="change_locale"
            phx-target={@myself}
            phx-value-locale={locale}
            class={"#{if locale == @locale, do: "active"}"}
            role="menuitem"
          >
            <span class="font-medium">{name}</span>
          </button>
        </li>
      </ul>
    </div>
    """
  end

  def handle_event("change_locale", %{"locale" => locale}, socket) do
    {:noreply, push_navigate(socket, to: "/locale/#{locale}")}
  end
end
