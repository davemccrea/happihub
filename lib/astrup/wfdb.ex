defmodule Astrup.Wfdb do
  def read(dataset_name, file_path) do
    dataset_path = Application.get_env(:astrup, :ecg_databases_path)
    read(dataset_path, dataset_name, file_path)
  end

  def detect_qrs(dataset_name, file_path) do
    dataset_path = Application.get_env(:astrup, :ecg_databases_path)
    detect_qrs(dataset_path, dataset_name, file_path)
  end

  def detect_qrs(dataset_path, dataset_name, file_path) do
    args = %{"dataset_path" => dataset_path, "db_name" => dataset_name, "file_path" => file_path}

    {result, _globals} =
      Pythonx.eval(
        """
        import wfdb
        from wfdb import processing

        dataset_path = dataset_path.decode('utf-8')
        db_name = db_name.decode('utf-8')
        file_path = file_path.decode('utf-8')

        sig, fields = wfdb.rdsamp(dataset_path + "/" + db_name + "/" + file_path, channels=[0])
        xqrs = processing.XQRS(sig=sig[:,0], fs=fields['fs'])
        xqrs.detect(learn=True)

        {
          'qrs_inds': xqrs.qrs_inds.tolist(),
          'fs': fields['fs']
        }
        """,
        args
      )

    result = Pythonx.decode(result)
    result["qrs_inds"]
  end

  def read(dataset_path, dataset_name, file_path) do
    args = %{"dataset_path" => dataset_path, "db_name" => dataset_name, "file_path" => file_path}

    {result, _globals} =
      Pythonx.eval(
        """
        import wfdb

        dataset_path = dataset_path.decode('utf-8')
        db_name = db_name.decode('utf-8')
        file_path = file_path.decode('utf-8')

        record = wfdb.rdrecord(dataset_path + "/" + db_name + "/" + file_path)
        record_dict = record.__dict__
        record_dict['p_signal'] = record.p_signal.tolist()
        record_dict
        """,
        args
      )

    Pythonx.decode(result)
  end
end
