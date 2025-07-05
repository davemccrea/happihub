defmodule AstrupWeb.ECGLive do
  use AstrupWeb, :live_view

  def mount(_params, _session, socket) do
    socket =
      assign(socket,
        is_playing: false,
        current_lead: 0,
        elapsed_time: 0,
        display_mode: "single",
        grid_type: "medical",
        lead_names: ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"]
      )

    {:ok, socket}
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} locale={@locale} current_scope={@current_scope}>
      <div class="space-y-12">
        <h1 class="text-2xl font-bold">ECG Test</h1>

        <div class="flex gap-4">
          <form phx-change="change_lead">
            <.input
              type="select"
              name="lead"
              value={@current_lead}
              label="Current Lead"
              options={
                Enum.with_index(@lead_names)
                |> Enum.map(fn {name, index} -> {"Lead #{name}", index} end)
              }
            />
          </form>

          <form phx-change="change_display_mode">
            <.input
              type="select"
              name="display_mode"
              value={@display_mode}
              label="Display Mode"
              options={[
                {"Single Lead", "single"},
                {"All Leads", "multi"}
              ]}
            />
          </form>

          <form phx-change="change_grid_type">
            <.input
              type="select"
              name="grid_type"
              value={@grid_type}
              label="Grid Type"
              options={[
                {"Medical Grid", "medical"},
                {"Simple Grid", "simple"}
              ]}
            />
          </form>
        </div>

        <div id="ecg-playback" phx-hook="ECGPlayback" phx-update="ignore">
          <div data-ecg-chart></div>
        </div>

        <.button phx-click="toggle_playback" variant="primary">
          {if @is_playing, do: "Pause", else: "Play"}
        </.button>
      </div>
    </Layouts.app>
    """
  end

  def handle_event("toggle_playback", _params, socket) do
    new_playing = !socket.assigns.is_playing
    socket = assign(socket, is_playing: new_playing)
    socket = push_event(socket, "playback_changed", %{is_playing: new_playing})
    {:noreply, socket}
  end

  def handle_event("change_lead", %{"lead" => lead_index_str}, socket) do
    case Integer.parse(lead_index_str) do
      {lead_index, ""} when lead_index >= 0 and lead_index < length(socket.assigns.lead_names) ->
        socket = assign(socket, current_lead: lead_index)
        socket = push_event(socket, "lead_changed", %{lead: lead_index})
        {:noreply, socket}

      _ ->
        {:noreply, socket}
    end
  end

  def handle_event("time_update", %{"elapsed_time" => elapsed_time}, socket) do
    socket = assign(socket, elapsed_time: elapsed_time)
    {:noreply, socket}
  end

  def handle_event("playback_ended", _params, socket) do
    socket = assign(socket, is_playing: false)
    {:noreply, socket}
  end

  def handle_event("change_display_mode", %{"display_mode" => display_mode}, socket) do
    if display_mode in ["single", "multi"] do
      socket = assign(socket, display_mode: display_mode)
      socket = push_event(socket, "display_mode_changed", %{display_mode: display_mode})
      {:noreply, socket}
    else
      {:noreply, socket}
    end
  end

  def handle_event("change_grid_type", %{"grid_type" => grid_type}, socket) do
    if grid_type in ["medical", "simple"] do
      socket = assign(socket, grid_type: grid_type)
      socket = push_event(socket, "grid_changed", %{grid_type: grid_type})
      {:noreply, socket}
    else
      {:noreply, socket}
    end
  end
end
