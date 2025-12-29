// Android App Data Models
// Copy these to your Android project

package com.sentinel.dns.model

import com.google.gson.annotations.SerializedName

// Device Info Model
data class DeviceInfo(
    val isp: String,
    val networkType: String,
    val androidVersion: String,
    val appVersion: String
)

// Check Result Model
data class CheckResult(
    val hostname: String,
    val status: String, // ACTIVE, BLOCKED, ERROR
    val ip: String,
    val latency: Int,
    val timestamp: Long
)

// Sync Request Model
data class SyncRequest(
    val deviceId: String,
    val deviceInfo: DeviceInfo,
    val results: List<SyncResultItem>
)

data class SyncResultItem(
    val hostname: String,
    val ispName: String,
    val status: String,
    val ip: String,
    val timestamp: Long,
    val latency: Int
)

// Sync Response Model
data class SyncResponse(
    val success: Boolean,
    val message: String,
    val processed: Int,
    val timestamp: Long
)

// Domains Response Model
data class DomainsResponse(
    val success: Boolean,
    val domains: List<String>,
    val interval: Long,
    val message: String
)

// Sync Result Model (for local use)
data class SyncResult(
    val success: Boolean,
    val message: String,
    val timestamp: Long
)

// Domain Model (for local database)
data class Domain(
    val id: String,
    val hostname: String,
    val isMonitoring: Boolean = true,
    val lastCheck: Long? = null
)

// Check Result Entity (for Room Database)
@Entity(tableName = "check_results")
data class CheckResultEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val hostname: String,
    val isp: String,
    val status: String,
    val ip: String,
    val latency: Int,
    val timestamp: Long,
    val synced: Boolean = false
)

