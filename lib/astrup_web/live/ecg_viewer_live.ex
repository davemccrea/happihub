defmodule AstrupWeb.ECGViewerLive do
  use AstrupWeb, :live_view

  alias Astrup.Ecgs

  def mount(params, _session, socket) do
    socket =
      assign(socket,
        lead_names: [],
        env: Application.get_env(:astrup, :env),
        ecg_loaded: false,
        ecg_saved: false
      )

    socket =
      case {params["db"], params["filename"]} do
        {db_name, filename} when is_binary(db_name) and is_binary(filename) ->
          load_ecg_from_params(socket, db_name, filename)

        _ ->
          socket
      end

    {:ok, socket}
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} locale={@locale} current_scope={@current_scope}>
      <div class="space-y-8">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-bold">{gettext("ECG Viewer")}</h1>
          <div class="flex gap-4 items-center">
            <%= if @ecg_loaded do %>
              <.button
                phx-click={if @ecg_saved, do: "unsave_ecg", else: "save_ecg"}
                class="btn btn-square"
                id="save-ecg-button"
              >
                <%= if @ecg_saved do %>
                  Unsave <.icon class="h-5 w-5" name="hero-trash" />
                <% else %>
                  Save <.icon class="h-5 w-5" name="hero-document-arrow-down" />
                <% end %>
              </.button>

              <.button id="play-pause-button">
                Play
              </.button>
            <% end %>
          </div>
        </div>

        <.live_component
          module={AstrupWeb.Components.EcgPlayer}
          id="ecg-player"
          ecg_loaded={@ecg_loaded}
          env={@env}
          lead_names={@lead_names}
        />
      </div>
    </Layouts.app>
    """
  end

  def handle_event("save_ecg", _params, socket) do
    case Ecgs.save_ecg(socket.assigns.current_scope, %{
           db_name: socket.assigns.db_name,
           filename: socket.assigns.filename
         }) do
      {:ok, _saved_ecg} ->
        socket = assign(socket, ecg_saved: true)
        {:noreply, put_flash(socket, :info, "ECG saved successfully!")}

      {:error, _changeset} ->
        {:noreply, put_flash(socket, :error, "Failed to save ECG")}
    end
  end

  def handle_event("unsave_ecg", _params, socket) do
    {count, _} =
      Ecgs.unsave_ecg(
        socket.assigns.current_scope,
        socket.assigns.db_name,
        socket.assigns.filename
      )

    if count > 0 do
      socket = assign(socket, ecg_saved: false)
      {:noreply, put_flash(socket, :info, "ECG unsaved successfully!")}
    else
      {:noreply, put_flash(socket, :error, "Failed to unsave ECG")}
    end
  end

  defp load_ecg_from_params(socket, db_name, filename) do
    ecg_data = Astrup.Wfdb.read(db_name, filename)
    qrs = Astrup.Wfdb.detect_qrs(db_name, filename)
    record = Map.put(ecg_data, "qrs", qrs)
    lead_names = Map.get(record, "sig_name", [])

    # Check if ECG is already saved
    ecg_saved = Ecgs.is_ecg_saved?(socket.assigns.current_scope, db_name, filename)

    socket
    |> assign(ecg_loaded: true)
    |> assign(lead_names: lead_names)
    |> assign(db_name: db_name)
    |> assign(filename: filename)
    |> assign(ecg_saved: ecg_saved)
    |> push_event("ecg_data_pushed", %{data: record})
  end
end
