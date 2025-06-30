defmodule AstrupWeb.SettingsLive do
  use AstrupWeb, :live_view

  def mount(_params, session, socket) do
    current_lab = session["current_lab"] || "Astrup.Lab.Fimlab"
    current_analyzer = session["current_analyzer"] || "Astrup.Analyzer.RadiometerAbl90FlexPlus"

    socket =
      socket
      |> assign(:current_lab, current_lab)
      |> assign(:current_analyzer, current_analyzer)
      |> assign(:page_title, gettext("Settings"))

    {:ok, socket}
  end

  def handle_event("update_settings", %{"lab" => lab, "analyzer" => analyzer}, socket) do
    {:noreply,
     socket
     |> redirect(to: "/update_settings?lab=#{lab}&analyzer=#{analyzer}&return_to=/settings")}
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} locale={@locale}>
      <div class="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 class="text-2xl font-semibold mb-6">{gettext("Settings")}</h1>

        <.form for={%{}} phx-submit="update_settings" class="space-y-6">
          <.input
            type="select"
            name="lab"
            label={gettext("Laboratory")}
            value={@current_lab}
            options={[{"Fimlab", "Astrup.Lab.Fimlab"}]}
          />

          <.input
            type="select"
            name="analyzer"
            label={gettext("Analyzer")}
            value={@current_analyzer}
            options={[{"Radiometer ABL90 FLEX PLUS", "Astrup.Analyzer.RadiometerAbl90FlexPlus"}]}
          />

          <div class="flex flex-col pt-8">
            <button type="submit" class="btn btn-primary">
              {gettext("Save Settings")}
            </button>
          </div>
        </.form>
      </div>
    </Layouts.app>
    """
  end
end
