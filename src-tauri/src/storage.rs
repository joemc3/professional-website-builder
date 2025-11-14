use anyhow::{Context, Result};

const SERVICE_NAME: &str = "professional-website-builder";

/// Save an API key securely to the OS keychain
pub fn save_api_key(provider: &str, api_key: &str) -> Result<()> {
    save_secret(provider, api_key)
}

/// Retrieve an API key from the OS keychain
pub fn get_api_key(provider: &str) -> Result<String> {
    get_secret(provider)
}

/// Delete an API key from the OS keychain
pub fn delete_api_key(provider: &str) -> Result<()> {
    delete_secret(provider)
}

#[cfg(target_os = "macos")]
fn save_secret(key: &str, value: &str) -> Result<()> {
    use security_framework::passwords::{set_generic_password};

    set_generic_password(SERVICE_NAME, key, value.as_bytes())
        .context("Failed to save secret to macOS Keychain")?;

    Ok(())
}

#[cfg(target_os = "macos")]
fn get_secret(key: &str) -> Result<String> {
    use security_framework::passwords::get_generic_password;

    let password_bytes = get_generic_password(SERVICE_NAME, key)
        .context("Failed to retrieve secret from macOS Keychain")?;

    String::from_utf8(password_bytes.to_vec())
        .context("Invalid UTF-8 in stored secret")
}

#[cfg(target_os = "macos")]
fn delete_secret(key: &str) -> Result<()> {
    use security_framework::passwords::delete_generic_password;

    delete_generic_password(SERVICE_NAME, key)
        .context("Failed to delete secret from macOS Keychain")?;

    Ok(())
}

#[cfg(target_os = "windows")]
fn save_secret(key: &str, value: &str) -> Result<()> {
    use windows::core::{PWSTR, w};
    use windows::Win32::Security::Credentials::{
        CredWriteW, CREDENTIALW, CRED_PERSIST_LOCAL_MACHINE, CRED_TYPE_GENERIC,
    };

    let target_name = format!("{}/{}", SERVICE_NAME, key);
    let mut target_name_wide: Vec<u16> = target_name.encode_utf16().chain(Some(0)).collect();
    let credential_blob: Vec<u8> = value.as_bytes().to_vec();

    let mut credential = CREDENTIALW {
        Flags: 0,
        Type: CRED_TYPE_GENERIC,
        TargetName: PWSTR(target_name_wide.as_mut_ptr()),
        Comment: PWSTR::null(),
        LastWritten: Default::default(),
        CredentialBlobSize: credential_blob.len() as u32,
        CredentialBlob: credential_blob.as_ptr() as *mut u8,
        Persist: CRED_PERSIST_LOCAL_MACHINE,
        AttributeCount: 0,
        Attributes: std::ptr::null_mut(),
        TargetAlias: PWSTR::null(),
        UserName: PWSTR::null(),
    };

    unsafe {
        CredWriteW(&credential, 0)
            .context("Failed to save secret to Windows Credential Manager")?;
    }

    Ok(())
}

#[cfg(target_os = "windows")]
fn get_secret(key: &str) -> Result<String> {
    use windows::core::PWSTR;
    use windows::Win32::Security::Credentials::{CredReadW, CREDENTIALW, CRED_TYPE_GENERIC, CredFree};

    let target_name = format!("{}/{}", SERVICE_NAME, key);
    let mut target_name_wide: Vec<u16> = target_name.encode_utf16().chain(Some(0)).collect();

    let mut credential_ptr: *mut CREDENTIALW = std::ptr::null_mut();

    unsafe {
        CredReadW(
            PWSTR(target_name_wide.as_mut_ptr()),
            CRED_TYPE_GENERIC,
            0,
            &mut credential_ptr,
        )
        .context("Failed to retrieve secret from Windows Credential Manager")?;

        if credential_ptr.is_null() {
            return Err(anyhow::anyhow!("Credential not found"));
        }

        let credential = &*credential_ptr;
        let blob = std::slice::from_raw_parts(
            credential.CredentialBlob,
            credential.CredentialBlobSize as usize,
        );

        let result = String::from_utf8(blob.to_vec())
            .context("Invalid UTF-8 in stored secret");

        CredFree(credential_ptr as *const _);

        result
    }
}

#[cfg(target_os = "windows")]
fn delete_secret(key: &str) -> Result<()> {
    use windows::core::PWSTR;
    use windows::Win32::Security::Credentials::{CredDeleteW, CRED_TYPE_GENERIC};

    let target_name = format!("{}/{}", SERVICE_NAME, key);
    let mut target_name_wide: Vec<u16> = target_name.encode_utf16().chain(Some(0)).collect();

    unsafe {
        CredDeleteW(PWSTR(target_name_wide.as_mut_ptr()), CRED_TYPE_GENERIC, 0)
            .context("Failed to delete secret from Windows Credential Manager")?;
    }

    Ok(())
}

#[cfg(target_os = "linux")]
fn save_secret(key: &str, value: &str) -> Result<()> {
    use secret_service::{SecretService, EncryptionType};
    use std::collections::HashMap;

    let ss = SecretService::connect(EncryptionType::Dh)
        .context("Failed to connect to Secret Service")?;

    let collection = ss.get_default_collection()
        .context("Failed to get default collection")?;

    let mut attributes = HashMap::new();
    attributes.insert("service", SERVICE_NAME);
    attributes.insert("key", key);

    collection
        .create_item(
            &format!("{}/{}", SERVICE_NAME, key),
            attributes,
            value.as_bytes(),
            true,
            "text/plain",
        )
        .context("Failed to save secret to Secret Service")?;

    Ok(())
}

#[cfg(target_os = "linux")]
fn get_secret(key: &str) -> Result<String> {
    use secret_service::{SecretService, EncryptionType};
    use std::collections::HashMap;

    let ss = SecretService::connect(EncryptionType::Dh)
        .context("Failed to connect to Secret Service")?;

    let collection = ss.get_default_collection()
        .context("Failed to get default collection")?;

    let mut search_attributes = HashMap::new();
    search_attributes.insert("service", SERVICE_NAME);
    search_attributes.insert("key", key);

    let items = collection.search_items(search_attributes)
        .context("Failed to search for secret in Secret Service")?;

    if items.is_empty() {
        return Err(anyhow::anyhow!("Secret not found"));
    }

    let secret = items[0].get_secret()
        .context("Failed to retrieve secret from Secret Service")?;

    String::from_utf8(secret)
        .context("Invalid UTF-8 in stored secret")
}

#[cfg(target_os = "linux")]
fn delete_secret(key: &str) -> Result<()> {
    use secret_service::{SecretService, EncryptionType};
    use std::collections::HashMap;

    let ss = SecretService::connect(EncryptionType::Dh)
        .context("Failed to connect to Secret Service")?;

    let collection = ss.get_default_collection()
        .context("Failed to get default collection")?;

    let mut search_attributes = HashMap::new();
    search_attributes.insert("service", SERVICE_NAME);
    search_attributes.insert("key", key);

    let items = collection.search_items(search_attributes)
        .context("Failed to search for secret in Secret Service")?;

    if !items.is_empty() {
        items[0].delete()
            .context("Failed to delete secret from Secret Service")?;
    }

    Ok(())
}
