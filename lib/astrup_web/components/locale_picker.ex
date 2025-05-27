defmodule AstrupWeb.Components.LocalePicker do
  use AstrupWeb, :live_component

  def render(assigns) do
    options = [{"English", "en"}, {"Svenska", "sv"}, {"Suomi", "fi"}]

    locale_name = fn locale ->
      case locale do
        "en" -> "English"
        "sv" -> "Svenska"
        "fi" -> "Suomi"
        _ -> "Unknown"
      end
    end

    assigns =
      assigns
      |> assign(:options, options)
      |> assign(:locale_name, locale_name)

    ~H"""
    <div>
      <.form for={%{}} phx-change="change_locale" phx-target={@myself}>
        <select id="locale-picker" class="select select-ghost" name="locale">
          {Phoenix.HTML.Form.options_for_select(@options, @locale)}
        </select>
      </.form>
    </div>
    """
  end

  def handle_event("change_locale", %{"locale" => locale}, socket) do
    {:noreply, push_navigate(socket, to: "/locale/#{locale}")}
  end
end
