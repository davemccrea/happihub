defmodule AstrupWeb.Layouts do
  @moduledoc """
  This module holds different layouts used by your application.

  See the `layouts` directory for all templates available.
  The "root" layout is a skeleton rendered as part of the
  application router. The "app" layout is rendered as component
  in regular views and live views.
  """
  use AstrupWeb, :html

  embed_templates "layouts/*"

  @doc """
  Renders the app layout

  ## Examples

      <Layouts.app flash={@flash}>
        <h1>Content</h1>
      </Layout.app>

  """
  attr :flash, :map, required: true, doc: "the map of flash messages"

  attr :current_scope, :map,
    default: nil,
    doc: "the current [scope](https://hexdocs.pm/phoenix/scopes.html)"

  attr :locale, :string, required: true, doc: "the current locale"

  slot :inner_block, required: true

  def app(assigns) do
    ~H"""
    <header>
      <div class="navbar bg-base-200 px-4">
        <div class="navbar-start">
          <.link navigate={~p"/"} class="btn btn-ghost">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              class="mr-2"
            >
              <!-- Happy face circle -->
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="currentColor"
                opacity="0.1"
                stroke="currentColor"
                stroke-width="2"
              />
              <!-- Eyes -->
              <circle cx="12" cy="12" r="2" fill="currentColor" />
              <circle cx="20" cy="12" r="2" fill="currentColor" />
              <!-- Smile -->
              <path
                d="M10 20 Q16 24 22 20"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                fill="none"
              />
              <!-- Hub connection lines -->
              <line
                x1="16"
                y1="2"
                x2="16"
                y2="6"
                stroke="currentColor"
                stroke-width="1.5"
                opacity="0.6"
              />
              <line
                x1="16"
                y1="26"
                x2="16"
                y2="30"
                stroke="currentColor"
                stroke-width="1.5"
                opacity="0.6"
              />
              <line
                x1="2"
                y1="16"
                x2="6"
                y2="16"
                stroke="currentColor"
                stroke-width="1.5"
                opacity="0.6"
              />
              <line
                x1="26"
                y1="16"
                x2="30"
                y2="16"
                stroke="currentColor"
                stroke-width="1.5"
                opacity="0.6"
              />
            </svg>
            <span class="text-xl font-bold">HappiHub</span>
          </.link>
        </div>

        <div class="navbar-center">
          <ul class="menu menu-horizontal">
            <li>
              <.link navigate={~p"/learn"} class="btn btn-ghost">
                {gettext("Reference Values")}
              </.link>
            </li>
            <li>
              <.link navigate={~p"/interpretation"} class="btn btn-ghost">
                {gettext("Interpretation")}
              </.link>
            </li>
            <li>
              <.link navigate={~p"/submit"} class="btn btn-ghost">
                {gettext("Submit ABG")}
              </.link>
            </li>
          </ul>
        </div>

        <div class="navbar-end space-x-2">
          <.live_component
            module={AstrupWeb.Components.LocalePicker}
            id="locale-picker"
            locale={@locale}
          />

          <.link navigate={~p"/settings"} class="btn btn-ghost btn-circle">
            <.icon name="hero-cog-6-tooth" class="size-5" />
          </.link>

          <Layouts.theme_toggle />
        </div>
      </div>
    </header>

    <main class="px-4 py-12 sm:px-6 lg:px-8 flex-grow">
      {render_slot(@inner_block)}
    </main>

    <footer class="footer footer-horizontal footer-center bg-base-200 text-base-content rounded p-10">
      <nav class="grid grid-flow-col gap-4">
        <a href="https://github.com/davemccrea">GitHub</a>
      </nav>
    </footer>

    <.flash_group flash={@flash} />
    """
  end

  @doc """
  Shows the flash group with standard titles and content.

  ## Examples

      <.flash_group flash={@flash} />
  """
  attr :flash, :map, required: true, doc: "the map of flash messages"
  attr :id, :string, default: "flash-group", doc: "the optional id of flash container"

  def flash_group(assigns) do
    ~H"""
    <div id={@id} aria-live="polite">
      <.flash kind={:info} flash={@flash} />
      <.flash kind={:error} flash={@flash} />

      <%!-- <.flash
        id="client-error"
        kind={:error}
        title={gettext("We can't find the internet")}
        phx-disconnected={show(".phx-client-error #client-error") |> JS.remove_attribute("hidden")}
        phx-connected={hide("#client-error") |> JS.set_attribute({"hidden", ""})}
        hidden
      >
        {gettext("Attempting to reconnect")}
        <.icon name="hero-arrow-path" class="ml-1 size-3 motion-safe:animate-spin" />
      </.flash>

      <.flash
        id="server-error"
        kind={:error}
        title={gettext("Something went wrong!")}
        phx-disconnected={show(".phx-server-error #server-error") |> JS.remove_attribute("hidden")}
        phx-connected={hide("#server-error") |> JS.set_attribute({"hidden", ""})}
        hidden
      >
        {gettext("Attempting to reconnect")}
        <.icon name="hero-arrow-path" class="ml-1 size-3 motion-safe:animate-spin" />
      </.flash> --%>
    </div>
    """
  end

  def admin(assigns) do
    ~H"""
    <Backpex.HTML.Layout.app_shell fluid={true}>
      <:topbar>
        <Backpex.HTML.Layout.topbar_branding />

        <Backpex.HTML.Layout.topbar_dropdown class="mr-2 md:mr-0">
          <:label>
            <label tabindex="0" class="btn btn-square btn-ghost">
              <.icon name="hero-user" class="size-6" />
            </label>
          </:label>
          <li>
            <.link navigate={~p"/"} class="text-error flex justify-between hover:bg-base-200">
              <p>Logout</p>
              <.icon name="hero-arrow-right-on-rectangle" class="size-5" />
            </.link>
          </li>
        </Backpex.HTML.Layout.topbar_dropdown>
      </:topbar>

      <:sidebar>
        <Backpex.HTML.Layout.sidebar_item current_url={@current_url} navigate={~p"/admin/printouts"}>
          <%!-- TODO: choose appropriate icon --%>
          <.icon name="hero-book-open" class="size-5" /> Printouts
        </Backpex.HTML.Layout.sidebar_item>
      </:sidebar>

      <Backpex.HTML.Layout.flash_messages flash={@flash} />

      {@inner_content}
    </Backpex.HTML.Layout.app_shell>
    """
  end

  @doc """
  Provides dark vs light theme toggle based on themes defined in app.css.

  See <head> in root.html.heex which applies the theme before page load.
  """
  def theme_toggle(assigns) do
    ~H"""
    <div class="card relative flex flex-row items-center border-2 border-base-300 bg-base-300 rounded-full">
      <div class="absolute w-1/2 h-full rounded-full border-1 border-base-200 bg-base-100 brightness-200 left-0 [[data-theme=dark]_&]:left-1/2 transition-[left]" />

      <button
        phx-click={JS.dispatch("phx:set-theme", detail: %{theme: "light"})}
        class="flex p-2 cursor-pointer w-1/2"
        aria-label="Light theme"
      >
        <.icon name="hero-sun-micro" class="size-4 opacity-75 hover:opacity-100" />
      </button>

      <button
        phx-click={JS.dispatch("phx:set-theme", detail: %{theme: "dark"})}
        class="flex p-2 cursor-pointer w-1/2"
        aria-label="Dark theme"
      >
        <.icon name="hero-moon-micro" class="size-4 opacity-75 hover:opacity-100" />
      </button>
    </div>
    """
  end
end
