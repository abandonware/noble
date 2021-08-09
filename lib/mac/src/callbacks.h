#pragma once

#include <napi.h>
#include "peripheral.h"

class ThreadSafeCallback {
  using arg_vector_t = std::vector<napi_value>;
  using arg_func_t = std::function<void(napi_env, arg_vector_t &)>;

  static void callJsCallback(Napi::Env env,
                             Napi::Function jsCallback,
                             Napi::Reference<Napi::Value> *context,
                             arg_func_t *argfn) {
    if (argfn != nullptr) {
      arg_vector_t args;

      (*argfn)(env, args);
      delete argfn;

      if (env != nullptr && jsCallback != nullptr)
        jsCallback.Call(context->Value(), args);
    }
  };
  using tsfn_t = Napi::TypedThreadSafeFunction<
    Napi::Reference<Napi::Value>, arg_func_t, callJsCallback>;

public:
  ThreadSafeCallback(const Napi::Value &receiver,
                     const Napi::Function &jsCallback) {
    if (!(receiver.IsObject() || receiver.IsFunction()))
      throw Napi::Error::New(jsCallback.Env(),
                             "Callback receiver must be an object or function");
    if (!jsCallback.IsFunction())
      throw Napi::Error::New(jsCallback.Env(), "Callback must be a function");

    receiver_ = Napi::Persistent(receiver);
    tsfn_ = tsfn_t::New(jsCallback.Env(),
                        jsCallback,
                        "ThreadSafeCallback callback",
                        0, 1, &receiver_);
  }
  ~ThreadSafeCallback() {
    // No further interaction with the thread safe function allowed.
    tsfn_.Abort();
  }
  void call(arg_func_t arg_function) {
    arg_func_t *argfn = new arg_func_t(arg_function);
    if (tsfn_.BlockingCall(argfn) != napi_ok)
      delete argfn;
  };

protected:
  ThreadSafeCallback(const ThreadSafeCallback &) = delete;
  ThreadSafeCallback& operator=(const ThreadSafeCallback &) = delete;
  ThreadSafeCallback& operator=(ThreadSafeCallback &&) = delete;

private:
  Napi::Reference<Napi::Value> receiver_;
  tsfn_t tsfn_;
};

class Emit {
public:
    void Wrap(const Napi::Value& receiver, const Napi::Function& callback);
    void RadioState(const std::string& status);
    void ScanState(bool start);
    void Scan(const std::string& uuid, int rssi, const Peripheral& peripheral);
    void Connected(const std::string& uuid, const std::string& error = "");
    void Disconnected(const std::string& uuid);
    void RSSI(const std::string& uuid, int rssi);
    void ServicesDiscovered(const std::string& uuid, const std::vector<std::string>& serviceUuids);
    void IncludedServicesDiscovered(const std::string& uuid, const std::string& serviceUuid, const std::vector<std::string>& serviceUuids);
    void CharacteristicsDiscovered(const std::string& uuid, const std::string& serviceUuid, const std::vector<std::pair<std::string, std::vector<std::string>>>& characteristics);
    void Read(const std::string& uuid, const std::string& serviceUuid, const std::string& characteristicUuid, const Data& data, bool isNotification);
    void Write(const std::string& uuid, const std::string& serviceUuid, const std::string& characteristicUuid);
    void Notify(const std::string& uuid, const std::string& serviceUuid, const std::string& characteristicUuid, bool state);
    void DescriptorsDiscovered(const std::string& uuid, const std::string& serviceUuid, const std::string& characteristicUuid, const std::vector<std::string>& descriptorUuids);
    void ReadValue(const std::string& uuid, const std::string& serviceUuid, const std::string& characteristicUuid, const std::string& descriptorUuid, const Data& data);
    void WriteValue(const std::string& uuid, const std::string& serviceUuid, const std::string& characteristicUuid, const std::string& descriptorUuid);
    void ReadHandle(const std::string& uuid, int descriptorHandle, const std::vector<uint8_t>& data);
    void WriteHandle(const std::string& uuid, int descriptorHandle);
protected:
    std::shared_ptr<ThreadSafeCallback> mCallback;
};
