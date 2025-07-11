defmodule AstrupWeb.Components.EcgPlayer do
  use AstrupWeb, :live_component

  def render(assigns) do
    ~H"""
    <div class="space-y-12">
      <div class="space-y-4">
        <%= if @ecg_loaded do %>
          <div class="flex justify-end">
            <div class="text-sm text-gray-500 flex items-center gap-2">
              <span>Use</span>
              <kbd class="kbd kbd-sm">↑</kbd>
              <kbd class="kbd kbd-sm">↓</kbd>
              <span>or</span>
              <kbd class="kbd kbd-sm">k</kbd>
              <kbd class="kbd kbd-sm">j</kbd>
              <span>to switch leads,</span>
              <kbd class="kbd kbd-sm">Space</kbd>
              <span>to play/pause</span>
            </div>
          </div>
        <% end %>
        
        <div class="relative py-8">
          <div
            id="ecg-playback"
            phx-hook="ECGPlayback"
            phx-update="ignore"
            phx-target={@myself}
            class="w-full"
            data-env={@env}
            data-initial-lead="1"
            data-initial-display-mode="single"
            data-initial-grid-type="simple"
          >
            <div data-ecg-chart class="w-full"></div>
          </div>

          <%= if not @ecg_loaded do %>
            <div class="absolute inset-0 flex items-center justify-center bg-base-100 bg-opacity-90">
              <div class="text-center space-y-4">
                <div class="text-6xl opacity-30">
                  <.icon name="hero-heart" class="w-16 h-16 mx-auto" />
                </div>
                <div class="space-y-2">
                  <p class="text-lg font-medium">No ECG Data Loaded</p>
                  <p class="text-sm text-gray-500">Click "Load Random ECG" to begin</p>
                </div>
              </div>
            </div>
          <% end %>
        </div>
      </div>


      <%= if @ecg_loaded do %>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <%= if @ptbxl_record do %>
            <div class="space-y-6">
              <div>
                <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
                  <.icon name="hero-document-text" class="w-5 h-5" /> Clinical Information
                </h2>

                <%= if @ptbxl_record.report && @ptbxl_record.report != "" do %>
                  <div class="mb-6">
                    <h3 class="font-semibold mb-3 flex items-center gap-1">
                      Medical Report
                    </h3>
                    
                    <%= if @translated_report do %>
                      <div class="space-y-3">
                        <div class="bg-success/10 p-4 rounded-lg text-sm border border-success/20">
                          <div class="flex items-center gap-2 mb-2">
                            <.icon name="hero-language" class="w-4 h-4 text-success" />
                            <span class="text-xs font-medium text-success">English Translation</span>
                          </div>
                          {String.capitalize(@translated_report)}
                        </div>
                        <div class="bg-info/10 p-4 rounded-lg text-sm border border-info/20">
                          <div class="flex items-center gap-2 mb-2">
                            <.icon name="hero-document-text" class="w-4 h-4 text-info" />
                            <span class="text-xs font-medium text-info">Original Report</span>
                          </div>
                          <div class="italic text-gray-600">
                            {String.capitalize(@ptbxl_record.report)}
                          </div>
                        </div>
                      </div>
                    <% else %>
                      <div class="bg-info/10 p-4 rounded-lg text-sm border border-info/20">
                        {String.capitalize(@ptbxl_record.report)}
                      </div>
                    <% end %>
                  </div>
                <% end %>

                <%= if length(@scp_codes_with_descriptions) > 0 do %>
                  <% # Group SCP codes by category
                  grouped_codes = Enum.group_by(@scp_codes_with_descriptions, & &1.kind)
                  diagnostic_codes = Map.get(grouped_codes, :diagnostic, [])
                  form_codes = Map.get(grouped_codes, :form, [])
                  rhythm_codes = Map.get(grouped_codes, :rhythm, []) %>

                  <div class="space-y-6">
                    <!-- Diagnostic Codes -->
                    <%= if length(diagnostic_codes) > 0 do %>
                      <div>
                        <h4 class="text-sm font-semibold mb-3 text-error flex items-center gap-2">
                          <div class="w-2 h-2 bg-error rounded-full"></div>
                          Diagnosis
                        </h4>
                        <div class="space-y-2">
                          <%= for scp <- diagnostic_codes do %>
                            <div class="bg-error/5 border border-error/20 rounded-lg p-3 hover:bg-error/10 transition-colors">
                              <div class="flex justify-between items-start mb-2">
                                <div class="flex items-center gap-2">
                                  <span class="badge badge-error font-mono text-xs">
                                    {scp.code}
                                  </span>
                                </div>
                                <span class="text-sm font-semibold text-error">
                                  {trunc(scp.confidence)}%
                                </span>
                              </div>
                              <p class="text-sm text-base-content/80 mb-2 leading-relaxed">
                                {String.capitalize(scp.description)}
                              </p>
                              <%= if scp.diagnostic_class do %>
                                <div class="text-xs text-base-content/60">
                                  Classification: {scp.diagnostic_class}
                                </div>
                              <% end %>
                            </div>
                          <% end %>
                        </div>
                      </div>
                    <% end %>
                    
    <!-- Form Codes -->
                    <%= if length(form_codes) > 0 do %>
                      <div>
                        <h4 class="text-sm font-semibold mb-3 text-info flex items-center gap-2">
                          <div class="w-2 h-2 bg-info rounded-full"></div>
                          Waveform Characteristics
                        </h4>
                        <div class="space-y-2">
                          <%= for scp <- form_codes do %>
                            <div class="bg-info/5 border border-info/20 rounded-lg p-3 hover:bg-info/10 transition-colors">
                              <div class="flex justify-between items-start mb-2">
                                <div class="flex items-center gap-2">
                                  <span class="badge badge-info font-mono text-xs">
                                    {scp.code}
                                  </span>
                                </div>
                              </div>
                              <p class="text-sm text-base-content/80 mb-2 leading-relaxed">
                                {String.capitalize(scp.description)}
                              </p>
                              <%= if scp.diagnostic_class do %>
                                <div class="text-xs text-base-content/60">
                                  Classification: {scp.diagnostic_class}
                                </div>
                              <% end %>
                            </div>
                          <% end %>
                        </div>
                      </div>
                    <% end %>
                    
    <!-- Rhythm Codes -->
                    <%= if length(rhythm_codes) > 0 do %>
                      <div>
                        <h4 class="text-sm font-semibold mb-3 text-success flex items-center gap-2">
                          <div class="w-2 h-2 bg-success rounded-full"></div>
                          Heart Rhythm
                        </h4>
                        <div class="space-y-2">
                          <%= for scp <- rhythm_codes do %>
                            <div class="bg-success/5 border border-success/20 rounded-lg p-3 hover:bg-success/10 transition-colors">
                              <div class="flex justify-between items-start mb-2">
                                <div class="flex items-center gap-2">
                                  <span class="badge badge-success font-mono text-xs">
                                    {scp.code}
                                  </span>
                                </div>
                              </div>
                              <p class="text-sm text-base-content/80 mb-2 leading-relaxed">
                                {String.capitalize(scp.description)}
                              </p>
                              <%= if scp.diagnostic_class do %>
                                <div class="text-xs text-base-content/60">
                                  Classification: {scp.diagnostic_class}
                                </div>
                              <% end %>
                            </div>
                          <% end %>
                        </div>
                      </div>
                    <% end %>
                  </div>
                <% end %>
              </div>
            </div>
          <% end %>

          <div class={if @ptbxl_record, do: "", else: "lg:col-span-2"}>
            <div class="space-y-6">
              <div class="card bg-base-200 shadow-xl">
                <div class="card-body">
                  <h2 class="card-title">
                    <.icon name="hero-adjustments-horizontal" class="w-5 h-5" /> ECG Controls
                  </h2>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <.input
                        type="select"
                        id="display-mode-selector"
                        label="Display Mode"
                        name="display-mode"
                        value="single"
                        options={[{"Single Lead", "single"}, {"All Leads", "multi"}]}
                      />
                    </div>

                    <div id="lead-selector-container">
                      <.input
                        type="select"
                        id="lead-selector"
                        label="Current Lead"
                        name="lead"
                        value={1}
                        options={
                          for {name, index} <- Enum.with_index(@lead_names) do
                            {"Lead #{name}", index}
                          end
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="card bg-base-200 shadow-xl">
                <div class="card-body">
                  <h2 class="card-title">
                    <.icon name="hero-cog-6-tooth" class="w-5 h-5" /> View Options
                  </h2>
                  <div class="space-y-6">
                    <div>
                      <.input
                        type="select"
                        id="grid-type-selector"
                        label="Grid Type"
                        name="grid-type"
                        value="simple"
                        options={[{"Medical Grid", "medical"}, {"Simple Grid", "simple"}]}
                      />
                    </div>

                    <div class="space-y-4">
                      <h3 class="text-sm font-medium text-base-content/70">Scale Adjustments</h3>

                      <div class="space-y-3">
                        <div class="flex flex-col space-y-2">
                          <div class="flex justify-between items-center">
                            <span class="text-sm font-medium">Grid Scale</span>
                            <div class="flex items-center gap-2">
                              <span id="grid-scale-value" class="text-xs text-base-content/70">
                                1.00x
                              </span>
                              <span id="grid-scale-speed" class="text-xs text-base-content/50">
                                25.0 mm/s
                              </span>
                            </div>
                          </div>
                          <input
                            type="range"
                            id="grid-scale-slider"
                            name="grid-scale"
                            min="0.75"
                            max="1.25"
                            step="0.01"
                            value="1.0"
                            class="range range-xs w-full"
                          />
                        </div>

                        <div class="flex flex-col space-y-2">
                          <div class="flex justify-between items-center">
                            <span class="text-sm font-medium">Amplitude Scale</span>
                            <div class="flex items-center gap-2">
                              <span id="amplitude-scale-value" class="text-xs text-base-content/70">
                                1.00x
                              </span>
                              <span id="amplitude-scale-gain" class="text-xs text-base-content/50">
                                10.0 mm/mV
                              </span>
                            </div>
                          </div>
                          <input
                            type="range"
                            id="amplitude-scale-slider"
                            name="amplitude-scale"
                            min="0.75"
                            max="1.25"
                            step="0.01"
                            value="1.0"
                            class="range range-xs w-full"
                          />
                        </div>

                        <div class="flex flex-col space-y-2">
                          <div class="flex justify-between items-center">
                            <span class="text-sm font-medium">Height Scale</span>
                            <div class="flex items-center gap-2">
                              <span id="height-scale-value" class="text-xs text-base-content/70">
                                1.20x
                              </span>
                              <span id="height-scale-pixels" class="text-xs text-base-content/50">
                                180px
                              </span>
                            </div>
                          </div>
                          <input
                            type="range"
                            id="height-scale-slider"
                            name="height-scale"
                            min="0.95"
                            max="1.45"
                            step="0.01"
                            value="1.2"
                            class="range range-xs w-full"
                          />
                        </div>
                      </div>
                    </div>

                    <div class="space-y-3">
                      <h3 class="text-sm font-medium text-base-content/70">Playback Options</h3>

                      <div class="space-y-2">
                        <.input
                          type="checkbox"
                          id="loop-checkbox"
                          label="Loop playback"
                          name="loop"
                          value="true"
                          checked={true}
                        />

                        <.input
                          type="checkbox"
                          id="qrs-indicator-checkbox"
                          label="QRS pulse indicator"
                          name="qrs-indicator"
                          value="true"
                          checked={true}
                        />

                        <.input
                          type="checkbox"
                          id="debug-checkbox"
                          label="Show diagnostics"
                          name="debug"
                          value="false"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      <% end %>
    </div>
    """
  end

  def handle_event("playback_changed", _params, socket), do: {:noreply, socket}
  def handle_event("lead_changed", _params, socket), do: {:noreply, socket}
  def handle_event("playback_ended", _params, socket), do: {:noreply, socket}
end
