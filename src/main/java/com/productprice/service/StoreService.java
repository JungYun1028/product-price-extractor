package com.productprice.service;

import com.productprice.model.Store;
import com.productprice.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class StoreService {

    private final StoreRepository repository;

    public List<Store> getAllStores() {
        return repository.findAll();
    }

    public Optional<Store> getStoreById(Long id) {
        return repository.findById(id);
    }

    public Optional<Store> getStoreByName(String storeName) {
        return repository.findByStoreName(storeName);
    }

    public List<Store> searchStores(String storeName, String channel, String branch) {
        return repository.findWithFilters(storeName, channel, branch);
    }

    @Transactional
    public Store createStore(Store store) {
        // 동일한 거래처명이 있으면 기존 거래처 반환
        Optional<Store> existing = repository.findByStoreName(store.getStoreName());
        if (existing.isPresent()) {
            log.info("거래처가 이미 존재합니다: {}", store.getStoreName());
            return existing.get();
        }
        return repository.save(store);
    }

    @Transactional
    public Store updateStore(Long id, Store store) {
        Store existing = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("거래처를 찾을 수 없습니다: " + id));
        
        if (store.getStoreName() != null) {
            existing.setStoreName(store.getStoreName());
        }
        if (store.getChannel() != null) {
            existing.setChannel(store.getChannel());
        }
        if (store.getBranch() != null) {
            existing.setBranch(store.getBranch());
        }
        if (store.getManager() != null) {
            existing.setManager(store.getManager());
        }
        
        return repository.save(existing);
    }

    @Transactional
    public void deleteStore(Long id) {
        repository.deleteById(id);
    }
}

