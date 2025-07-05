defmodule AstrupWeb.ECGLive do
  use AstrupWeb, :live_view

  def mount(_params, _session, socket) do
    socket =
      assign(socket,
        is_playing: false,
        current_lead: 0,
        elapsed_time: 0,
        lead_names: ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"]
      )

    {:ok, socket}
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} locale={@locale} current_scope={@current_scope}>
      <div class="space-y-12">
        <h1 class="text-2xl font-bold">ECG Test</h1>

        <form phx-change="change_lead">
          <.input
            type="select"
            name="lead"
            value={@current_lead}
            options={
              Enum.with_index(@lead_names)
              |> Enum.map(fn {name, index} -> {"Lead #{name}", index} end)
            }
          />
        </form>

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
end
